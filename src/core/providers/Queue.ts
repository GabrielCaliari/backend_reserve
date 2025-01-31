const throttledQueue = require('throttled-queue');

const throttle = throttledQueue(2, 15000);

export default throttle;