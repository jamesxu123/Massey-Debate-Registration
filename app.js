require('dotenv').load();

const express = require('express');
const cors = require('cors')

const bodyParser      = require('body-parser');
const methodOverride  = require('method-override');
const morgan          = require('morgan');
const cookieParser    = require('cookie-parser');
const cluster         = require('cluster');
const cpuCount        = require('os').cpus().length;

const mongoose        = require('mongoose');
const port            = process.env.PORT || 3005;
const database        = process.env.DATABASE || "mongodb://localhost:27017";

// Start configuration
const organizers      = require('./config/organizers');
const settings        = require('./config/settings');

// Start services
const autoRemove      = require('./app/server/services/autoRemove');
const stats           = require('./app/server/services/stats');
//const waiverReceiver     = require('./app/server/services/waiverReceiver');
const Raven           = require('raven');

Raven.config('https://3a2e17bfabed451a97d9237d87e6d72b@sentry.io/1256420').install();

var app = express();
mongoose.connect(database);

if (cluster.isMaster) {
    console.log(`Master ${process.pid} is running`);

    for (let i = 0; i < cpuCount; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
        console.log(`worker ${worker.process.pid} died`);
    });
} else {

    console.log(`Worker ${process.pid} started`);

    // Start routers
    app.use(express.static('app/client/'));

    var apiRouter = express.Router();
    require('./app/server/routes/api')(apiRouter);
    app.use('/api', apiRouter);

    var authRouter = express.Router();
    require('./app/server/routes/auth')(authRouter);
    app.use('/auth', authRouter);

    require('./app/server/routes')(app);

    app.listen(port, function () {
        console.log('listening on *:' + port);
    });

}