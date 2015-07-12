/**
* Handles the CLI operation for "linting" (error-checking) a file.
*/

/// <reference path="../refs.ts"/>

import types = require("node-author-intrusion");

import io = require("../io");

export function run(argv) {
    // Create a loader and set up the common options for loading.
    var loader = new io.Loader();
    var options: io.LoadContentOptions = new io.LoadContentOptions();
    options.projectPath = argv.projectPath;

    // Go through each of the command line options and analyze each one.
    for (var contentIndex in argv._) {
        var contentPath = argv._[contentIndex];

        loader.loadContent(
            contentPath,
            options,
            content => onContentLoaded(content, argv));
    }
}

function onContentLoaded(content, argv) {
    // If the content is null or the content's project is null, then we couldn't
    // load it, so we should skip it.
    if (content == null || content.project == null) {
        return;
    }

    // Figure out the formatter and build up the process arguments.
    var output;

    switch (argv.format) {
        case "json":
            output = new JsonAnalysisOutput();
            break;
        default:
            output = new GccAnalysisOutput();
            break;
    }

    output.writeStart();

    // Go through the analysis plugins for this project.
    for (var i in content.project.analysis) {
        // Load the analysis plugin settings.
        var analysis: types.Analysis = content.project.analysis[i];
        var plugin: types.AnalysisPlugin;
        var args = new types.AnalysisArguments();
        args.content = content;
        args.analysis = analysis;
        args.output = output;

        try {
            output.writeInfo("Running analysis: " + analysis.name);
            plugin = require(analysis.plugin);
        } catch (e) {
            output.writeError(
                analysis.name + ": " + e,
                new types.Location(content.path, 0, 0));
            break;
        }

        // Perform the analysis on the content.
        try {
            plugin.process(args);
        } catch (e) {
            output.writeError(
                analysis.name + ": " + e,
                new types.Location(content.path, 0, 0));
            console.log(e.stack);
            break;
        }
    }

    // Indicate we are done processing.
    output.writeEnd();
    output.writeInfo(content.path + ": Finished analyzing");
}

class JsonAnalysisOutput implements types.AnalysisOutput {
    isFirst: boolean;

    public writeStart() {
        console.log("[");
        this.isFirst = true;
    }

    public writeEnd() {
        console.log("]");
    }

    public writeInfo(message: string): void {
    }

    public writeWarning(message: string, location: types.Location): void {
        this.writeMessage("warning", message, location);
    }

    public writeError(message: string, location: types.Location) {
        this.writeMessage("error", message, location);
    }

    writeMessage(type: string, message: string, location: types.Location) {
        var result = {
            type: type,
            text: message,
            filePath: location.path,
            range: [
                [location.beginLine, location.beginColumn],
                [location.endLine, location.endColumn]
            ]
        };
        var json = JSON.stringify(result);

        if (this.isFirst) {
            this.isFirst = false;
        } else {
            json = "," + json;
        }

        console.log(json);
    }
}

class GccAnalysisOutput implements types.AnalysisOutput {
    public writeStart() { }
    public writeEnd() { }

    public writeInfo(message: string): void {
        console.log(message);
    }

    public writeWarning(message: string, location: types.Location): void {
        if (location == null) {
            console.error("WARN: " + message);
        } else {
            console.error(this.getPrefix(location) + ": WARN: " + message);
        }
    }

    public writeError(message: string, location: types.Location) {
        if (location == null) {
            console.error("ERROR: " + message);
        } else {
            console.error(this.getPrefix(location) + ": ERROR: " + message);
        }
    }

    private getPrefix(location: types.Location): string {
        var prefix = "";
        prefix += location.path;
        prefix += ":" + (location.beginLine + 1) + ":" + (location.beginColumn + 1);
        return prefix;
    }
}
