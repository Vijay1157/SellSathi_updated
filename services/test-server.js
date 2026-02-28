const express = require('express');
const app = express();
app.use(express.json());
app.post('/test-payload', (req, res) => {
    console.log(JSON.stringify(req.body, null, 2));
    res.json({ success: true });
});
app.listen(9999, () => console.log('listening'));
