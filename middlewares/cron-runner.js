// cron-runner.js
const checkAndExpireYearlySubscriptions = require('../utils/checkAndExpireYearlySubscriptions');

(async () => {
  await checkAndExpireYearlySubscriptions();
  process.exit(0); 
})();
