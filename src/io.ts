/// <reference path="./refs" />

import byline = require("byline");
import findup = require("findup-sync");
import fs = require("fs");
import stream = require("stream");
import yaml = require("js-yaml");
import path = require("path");

import types = require("node-author-intrusion");

/**
 * Manages the IO for the content and project files.
 */
export class Loader {
    projects: types.Project[] = [];

    public loadContent(
        contentPath: string,
        options: LoadContentOptions,
        onSuccess: LoadContentSuccessCallback) {
        // We need to get a project associated with the content. This will come from
        // either the options.projectPath or is calculated from the contentPath.
        this.loadProject(
            contentPath,
            options,
            project => this.onLoadedProject(contentPath, options, project, onSuccess));
    }

    private getProjectPath(projectPath: string, contentPath: string): string {
        // If we have a project provided, then just use that directly.
        if (projectPath != null) {
            return projectPath;
        }

        // Since we don't have a project, then calculate it by using the content path,
        // go up until we find project.aipj, and then use that.
        projectPath = findup("project.aipj", { cwd: contentPath, nocase: true });
        return projectPath;
    }

    private loadProject(
        contentPath: string,
        options: LoadContentOptions,
        onSuccess: LoadProjectSuccessCallback) {
        // Get the project file path, which we need to load as a JSON file.
        var projectPath = this.getProjectPath(options.projectPath, contentPath);

        // If the project doesn't exist, then just return null to indicate not found.
        if (!fs.existsSync(projectPath)) {
            onSuccess(null);
            return;
        }

        // Load the entire thing into memory and then cast it to a project file.
        var data: string = fs
            .readFileSync(projectPath, { encoding: "utf8" })
            .toString();
        var projectData = JSON.parse(data);
        var project: types.Project = new types.Project(projectData);

        // Use the callback with the loaded project.
        onSuccess(project);
    }

    private onLoadedProject(
        contentPath: string,
        options: LoadContentOptions,
        project: types.Project,
        onSuccess: LoadContentSuccessCallback) {
        // If the content doesn't exist, then we skip it. We don't stop
        // procesing because we want the plugin to be able to handle missing
        // files.
        if (!fs.existsSync(contentPath)) {
            onSuccess(null);
            return;
        }

        // Create the content file that we'll be populating and assign the project
        // so we can reference it.
        var content = new types.Content();
        content.project = project;
        content.path = contentPath;

        // Open a stream into the file we're loading and then populate the lines
        // inside the source file object. This will also handle the YAML metadata
        // separately from the rest of the file.
        var data: string = fs
            .readFileSync(contentPath, { encoding: "utf8" })
            .toString();
        var texts: string[] = data.split("\n");

        for (var i in texts) {
            var text = texts[i];
            var location = new types.Location(contentPath, i, 0, i, text.length + 1);
            var line = new types.Line(location, text);

            content.lines.push(line);
        }

        // See if we have a YAML header and parse it.
        this.parseYaml(content);

        // Now that we are done, use the callback to finish it.
        onSuccess(content);
    }

    private parseYaml(content: types.Content) {
        // See if we have at least one line, if not, then there is no metdata.
        // Likewise, if the first line isn't "---", then we assume there is no
        // metadata available.
        if (content.lines.length == 0 || content.lines[0].text !== "---") {
            return;
        }

        // Figure out the second index of "---" which is the end of the metadata.
        // We start at 1 to avoid hitting the first "---" which we already know about.
        // If we didn't find it, then we assume there is no metadata.
        var nextIndex = content.indexOfText("---", 1);

        if (nextIndex < 0) {
            return;
        }

        // Extract the lines from the lines. This way, they aren't processed as
        // content lines.
        var metadataText = content.getText(0, nextIndex);
        content.lines.splice(0, nextIndex + 1);

        // Parse the metadata as YAML.
        var metadata = yaml.load(metadataText);
        content.metadata = metadata;
    }
}

export class LoadContentOptions {
    projectPath: string;
}

export interface LoadContentSuccessCallback { (content: types.Content): void; }
export interface LoadProjectSuccessCallback { (project: types.Project): void; }
