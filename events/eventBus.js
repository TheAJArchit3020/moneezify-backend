const { EventEmitter } = require("events");
class AppEventBus extends EventEmitter {}
module.exports = new EventEmitter();
