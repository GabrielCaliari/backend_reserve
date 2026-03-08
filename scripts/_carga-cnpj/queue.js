import throttledQueue from 'throttled-queue';

const throttle = throttledQueue(5, 1000);

export default throttle;