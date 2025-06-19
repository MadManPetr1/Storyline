const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./db/database');
const storyRoutes = require('./routes/story');
const lineRoutes = require('./routes/line');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

app.use('/api/story', storyRoutes);
app.use('/api/line', lineRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin', require('./routes/admin'));

app.get('/', (req, res) => res.send('Backend is working!'));

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});