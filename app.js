var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var morgan = require('morgan');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var logger = require('./utility/logger');
var passport = require('passport');
var i18n = require('./models/i18n');
var saker = require('saker');

/*控制器*/
var bodyParser = require('body-parser');
var indexCtrler = require('./routes/index');
var blogCtrler = require('./routes/blog');
var miscCtrler = require('./routes/misc');
var authCtrler = require('./routes/auth');
var adminCtrler = require('./routes/admin');
var localeCtrler = require('./routes/locale');
var ueCtrler = require('./routes/ue');

var app = express();

(function init()
{
    /*设置模板引擎*/
    mSetupViewEngine();
    /*使用中间件*/
    mUseMids();
})();

/**
 * 设置模板引擎
 **/
function mSetupViewEngine()
{
    saker.config({
        defaultLayout: './shared/layout.html',
        partialViewDir: './views/shared/'
    });
    app.engine('html', saker.renderView);
    app.set('views', path.join(__dirname, 'views'));
    app.set('view engine', 'html');
}

/**
 * 使用中间件
 **/
function mUseMids()
{
    /*使用前置中间件*/
    mUsePrevMids();
    /*映射路由控制器*/
    mMapRoutesToCtrlers();
    /*404处理*/
    app.use(m404Mid);
    /*500错误*/
    app.use(m500Mid);
}

/**
 * 使用前置中间件
 **/
function mUsePrevMids()
{
    app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));//服务器图标
    app.use(morgan('dev'));//日志
    app.use(bodyParser.json());//post内容体解析
    app.use(bodyParser.urlencoded({extended: false}));//url参数解析
    app.use(cookieParser());//cookie解析
    app.use(i18n.init);//国际化
    /*使用会话中间件*/
    mUseSessMid();
    app.use(express.static(path.join(__dirname, 'public')));//静态资源
    app.use(passport.initialize());//认证解析
    app.use(passport.session());
}

/**
 * 使用会话中间件
 **/
function mUseSessMid()
{
    var sessOpts =//
        {
            secret: 'iblog-exp-session',
            cookie://
                {
                    maxAge: 24 * 60 * 60 * 1000
                },
            resave: false,
            saveUninitialized: false
        }
    app.use(session(sessOpts));
}

/**
 * 映射路由控制器
 **/
function mMapRoutesToCtrlers()
{
    app.use('/', indexCtrler);
    app.use('/', localeCtrler);
    app.use('/', miscCtrler);
    app.use('/', authCtrler);
    app.use('/blog', blogCtrler);
    app.use('/admin', require('connect-ensure-login').ensureLoggedIn('/login'), adminCtrler);
    app.use('/ue/controller', ueCtrler);
}

/**
 * 404处理中间件
 **/
function m404Mid(req, res, next)
{
    var err = new Error();
    err.status = 404;
    next(err);
}

/**
 * 500处理中间件
 **/
function m500Mid(err, req, res, next)
{
    var code = err.status || 500,
        message = code === 404 ? res.__('error.404_1') : res.__('error.404_2');
    res.status(code);
    logger.errLogger(req, err);
    res.render('./shared/error', {
        code: code,
        message: message
    });
}

module.exports = app;
