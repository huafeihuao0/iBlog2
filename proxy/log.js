var logModel = require('../models/log').LogModel;

/**
 * 获取所有日志
 * @param params 参数对象
 * @param callback 回调函数
 */
function getAll(params, callback)
{
    /*拼接查询选项*/
    var options = mConcatQueryOpts(params);
    logModel.find({}, {}, options, function (err, logs)
    {
        if (err)
        {
            return callback(err);
        }
        return callback(null, logs);
    });
};

/**
 * 拼接查询选项
 * @param params 参数对象
 **/
function mConcatQueryOpts(params)
{
    var page = parseInt(params.pageIndex) || 1;
    var size = parseInt(params.pageSize) || 10;
    page = page > 0 ? page : 1;
    var options = {};
    options.skip = (page - 1) * size;
    options.limit = size;
    switch (params.sortName)
    {
        case 'level':
            options.sort = params.sortOrder === 'desc' ? '-level -timestamp' : 'level timestamp';
            break;
        default:
            options.sort = params.sortOrder === 'desc' ? '-timestamp' : 'timestamp';
            break;
    }
    return options;
}

/**
 * 获取日志数
 * @param params 参数对象
 * @param callback 回调函数
 */
function getAllCount(params, callback)
{
    logModel.count(function (err, count)
    {
        if (err)
        {
            return callback(err);
        }
        return callback(null, count);
    });
};


exports.getAll = getAll; //获取所有日志
exports.getAllCount = getAllCount; //获取日志数