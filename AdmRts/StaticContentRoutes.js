const express = require('express');
const router = express.Router();
const contentController = require('../AdmCtrl/StaticContentControllers');


router.get('/:section', contentController.getContent);
router.post('/', contentController.upsertContent);
router.get('/content/:section', contentController.getStaticContent);

module.exports = router;
