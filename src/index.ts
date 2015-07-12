export function run(commandName: string, argv: any) {
    var command = require("./processes/" + commandName);
    command.run(argv);
}
