var winston = require('winston');
var dbPath = require('../config').DbPath;
// var dbPath =  process.env.MONGOLAB_URI;
var os = require('os');
require('winston-mongodb').MongoDB;
var logger;
(function init()
{
    /*初始化日志器*/
    mInitLogger();
})();

/**
 * 初始化日志器
 **/
function mInitLogger()
{
    var loggerOpts =//
        {
            transports: //
                [
                    mCreateConsoleLoggerTrans(),//创建控制台日志通道
                    mCreateMongodbLoggerTrans()//创建mongodb日志通道
                ],
            exitOnError: false
        }
    logger = new (winston.Logger)(loggerOpts);
}

/**
 * 创建控制台日志通道
 **/
function mCreateConsoleLoggerTrans()
{
    var consoleLoggerTransOpts =//
        {
            json: true,
            colorize: true,
            level: 'error',
            handleExceptions: true
        }
    return new (winston.transports.Console)(consoleLoggerTransOpts);
}

/**
 * 创建mongodb日志通道
 **/
function mCreateMongodbLoggerTrans()
{
    var mongodbLoggerTransOpts =//
        {
            db: dbPath,
            level: 'info', //会记录info、warn、error3个级别的日志
            handleExceptions: true
        }
    return new (winston.transports.MongoDB)(mongodbLoggerTransOpts);
}

/**
 * 记录错误日志
 * @param req 请求对象
 * @param err 错误对象
 */
function errLogger(req, err)
{
    var obj = {},
        message = err.message;
    /*获取进程信息*/
    obj.process = mGetProcessInfo();
    /*获取系统信息*/
    obj.os = mGetOSInfo();
    obj.stack = err.stack && err.stack.split('\n');//栈信息
    obj.code = err.status || 500;//错误码
    /*获取请求参数*/
    var query = mGetQueryFromReq(req);
    /*获取请求信息*/
    obj.req = mGetReqInfo(req, query);
    if (!message && obj.code === 404)
    {
        message = 'not fount "' + req.originalUrl + '"';
    }
    logger.error(message, obj);
};

/**
 * 获取进程信息
 **/
function mGetProcessInfo()
{
    var processInfo =
        {
            pid: process.pid,
            uid: process.getuid ? process.getuid() : null,
            gid: process.getgid ? process.getgid() : null,
            cwd: process.cwd(),
            execPath: process.execPath,
            version: process.version,
            argv: process.argv,
            memoryUsage: process.memoryUsage()
        };
    return processInfo;
}

/**
 * 获取请求参数
 * @param req {Request} 请求对象
 **/
function mGetQueryFromReq(req)
{
    var query = {};//请求参数
    for (var q in req.query)
    {
        query[q] = req.query[q];
    }
    return query;
}
/**
 * 获取系统信息
 **/
function mGetOSInfo()
{
    var osInfo =//
        {
            hostname: os.hostname(),
            loadavg: os.loadavg(),
            uptime: os.uptime()
        }
    return osInfo;
}

/**
 * 获取请求信息
 * @param req {Request} 请求对象
 * @param queries {Object} 查询参数
 **/
function mGetReqInfo(req, queries)
{
    var reqInfo = //
        {
            baseUrl: req.baseUrl,
            originalUrl: req.originalUrl,
            query: queries,
            body: req.body,
            ip: req.ip,
            route: req.route
        };
    return reqInfo;
}

exports.errLogger = errLogger;