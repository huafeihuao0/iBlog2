var redis = require('redis');
var config = require('../config');
var redisActive = config.Redis.Active;

(function init()
{
    /*监听redis状态*/
    mListenRedis();
})();

/**
* 监听redis状态
**/
function mListenRedis()
{
    if (redisActive)
    {
        var client = redis.createClient(config.Redis.Port || 6379, config.Redis.Host || 'localhost');
        client.on('error', function (err)
        {
            console.error('Redis连接错误: ' + err);
            process.exit(1);//当redis出错的时候直接退出
        });
    }
}

/**
 * 设置缓存
 * @param key 缓存key
 * @param value 缓存value
 * @param expired 缓存的有效时长，单位秒
 * @param callback 回调函数
 */
function setItem(key, value, expired, callback)
{
    if (!redisActive)
    {
        return callback(null);
    }
    client.set(key, JSON.stringify(value), function (err)
    {
        if (err)
        {
            return callback(err);
        }
        if (expired)
        {
            client.expire(key, expired);
        }
        return callback(null);
    });
};

/**
 * 获取缓存
 * @param key 缓存key
 * @param callback 回调函数
 */
function getItem(key, callback)
{
    if (!redisActive)
    {
        return callback(null, null);
    }
    client.get(key, function (err, reply)
    {
        if (err)
        {
            return callback(err);
        }
        return callback(null, JSON.parse(reply));
    });
};

/**
 * 移除缓存
 * @param key 缓存key
 * @param callback 回调函数
 */
function removeItem(key, callback)
{
    if (!redisActive)
    {
        return callback(null);
    }
    client.del(key, function (err)
    {
        if (err)
        {
            return callback(err);
        }
        return callback(null);
    });
};


exports.setItem = setItem;//设置缓存
exports.getItem = getItem;//获取缓存
exports.removeItem = removeItem; //移除缓存
exports.defaultExpired = parseInt(require('../config/settings').CacheExpired);//获取默认过期时间，单位秒