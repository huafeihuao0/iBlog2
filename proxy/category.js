var categoryModel = require('../models/category').CategoryModel;
var post = require('../models/post').PostModel;
var shortid = require('shortid');
var tool = require('../utility/tool');
var redisClient = require('../utility/redisClient');
var i18n = require('../models/i18n')

//全部分类
var cateAll = //
    {
        "_id": "",
        "Alias": "",
        "CateName": i18n.__("Category.all"),
        "Img": "/images/全部分类.svg"
    };
//未分类
var cateOther = //
    {
        "_id": "other",
        "Alias": "other",
        "CateName": i18n.__("Category.uncate"),
        "Img": "/images/未分类.svg"
    };

/**
 * 获取分类数据
 * @param [isAll] 是否包含全部分类和未分类
 * @param [cached] 是否读取缓存
 * @param callback 回调函数
 */
function getAll(isAll, cached, callback)
{
    /*检查回调函数*/
    if (typeof cached === 'function')
    {
        callback = cached;
        cached = true;
    } else if (typeof isAll === 'function')
    {
        callback = isAll;
        isAll = true;
        cached = true;
    }
    //缓存的key名称
    var cache_key = isAll ? 'categories_all' : 'categories';
    if (cached)
    {
        /*尝试读取缓存*/
        mTryReadCachedCategory(callback);
    } else //不从缓存中读取---》直接读取数据库
    {
        /*从数据库中读取分类*/
       mQueryCategoryFromDB(callback,false);
    }
};

/**
 * 尝试读取缓存中的分类
 **/
function mTryReadCachedCategory(callback)
{
    //尝试读取缓存
    redisClient.getItem(cache_key, function (err, categories)
    {
        //读取缓存出错
        if (err)
        {
            return callback(err);
        }
        //缓存中有数据
        if (categories)
        {
            return callback(null, categories);
        }
        /*从数据库中读取分类*/
        mQueryCategoryFromDB(callback,true);
    });
}

/**
 * 从数据库中读取分类
 *
 * @param toCache {Boolean} 读取到的数据是否存入缓存
 **/
function mQueryCategoryFromDB(callback, toCache)
{
    //缓存中没有数据，则从数据库中读取
    categoryModel.find(function (err, categories)
    {
        //读取数据库出错
        if (err)
        {
            return callback(err);
        }
        if (isAll)
        {
            categories.unshift(cateAll);
            categories.push(cateOther);
        }
        //从数据库中读到数据，并且存入redis缓存
        if (toCache && categories)
        {
            /*将分类存入redis缓存*/
            mSaveCategoriesToRedis(categories, callback)
        }
        return callback(null, categories);
    });
}

/**
 * 将分类存入redis缓存
 **/
function mSaveCategoriesToRedis(categories, callback)
{
    //将数据塞入缓存
    redisClient.setItem(cache_key, categories, redisClient.defaultExpired, function (err)
    {
        if (err)
        {
            return callback(err);
        }
    })
}

/**
 * 根据分类alias获取分类
 * @param alias 分类alias
 * @param callback 回调函数
 * @returns {*}
 */
function getByAlias(alias, callback)
{
    var cache_key = 'category_' + alias;
    if (alias)
    {
        if (alias === 'other')//未分类
        {
            return callback(null, cateOther);
        } else //分类了
        {
            /*从缓存中查询指定别名的分类*/
            mQueryCategoryByAliasFromCache(alias,cache_key,callback);
        }
    } else
    {
        return callback(null, cateAll);
    }
};

/**
* 从缓存中查询指定别名的分类
**/
function mQueryCategoryByAliasFromCache(alias,cache_key,callback)
{
    redisClient.getItem(cache_key, function (err, category)
    {
        if (err)
        {
            return callback(err);
        }
        if (category)
        {
            return callback(null, category);
        }
        /*从数据库中按别名查询分类*/
        mQueryCategoryByAliasFromDB(alias,callback);
    });
}

/**
* 从数据库中按别名查询分类
**/
function mQueryCategoryByAliasFromDB(alias,callback)
{
    categoryModel.findOne({"Alias": alias}, function (err, category)
    {
        if (err)
        {
            return callback(err);
        }
        if (category)
        {
            /*保存查询到的分类到redis缓存*/
           mSaveAliasedCategoryToRedis(category,callback);
        }
        return callback(null, category);
    });
}

/**
* 保存查询到的分类到redis缓存
**/
function mSaveAliasedCategoryToRedis(category,callback)
{
    redisClient.setItem(cache_key, category, redisClient.defaultExpired, function (err)
    {
        if (err)
        {
            return callback(err);
        }
    })
}

/**
 * 保存分类数据
 * @param array 分类集合
 * @param callback 回调函数
 */
function save(array, callback)
{
    var jsonArray = [],
        toUpdate = [],
        updateQuery = [],
        cateNew;
    if (array.length > 0)
    {
        array.forEach(function (item)
        {
            jsonArray.push({
                _id: item.uniqueid || shortid.generate(),
                CateName: item.catename,
                Alias: item.alias,
                Img: item.img,
                Link: item.link,
                CreateTime: new Date(),
                ModifyTime: new Date()
            });
        });
    }
    categoryModel.find(function (err, categories)
    {
        if (err)
        {
            return callback(err);
        }
        categories.forEach(function (old)
        {
            cateNew = tool.jsonQuery(jsonArray, {"_id": old._id});
            if (!cateNew)
            {
                //该分类将被删除
                toUpdate.push(old._id);
            } else
            {
                //该分类依然存在，则创建时间沿用原创建时间
                cateNew.CreateTime = old.CreateTime;
                //若该分类未做任何修改，则修改时间沿用原修改时间
                if (cateNew.CateName.toString() === old.CateName.toString() && cateNew.Alias.toString() === old.Alias.toString() && cateNew.Img === old.Img && cateNew.Link === old.Link)
                {
                    cateNew.ModifyTime = old.ModifyTime;
                }
            }
        });

        //将已被删除分类的文章设为"未分类"
        if (toUpdate.length > 0)
        {
            toUpdate.forEach(function (cateId)
            {
                updateQuery.push({
                    "CategoryId": cateId
                });
            });
            post.update({"$or": updateQuery}, {"CategoryId": "other"}, {multi: true}, function (err)
            {
                if (err)
                {
                    return callback(err);
                }
            });
        }

        //将分类全部删除
        categoryModel.remove(function (err)
        {
            if (err)
            {
                return callback(err);
            }
            if (jsonArray.length > 0)
            {
                //插入全部分类
                //categoryModel.create(jsonArray, function (err) {}); //不用这个，因为这个内部实现依然是循环插入，不是真正的批量插入
                //这里采用mongodb原生的insert来批量插入多个文档
                categoryModel.collection.insert(jsonArray, function (err)
                {
                    if (err)
                    {
                        return callback(err);
                    }
                    return callback(null);
                });
            } else
            {
                return callback(null);
            }
        });
    });
};


exports.getAll = getAll; //获取分类数据
exports.getByAlias = getByAlias; //根据分类alias获取分类
exports.save = save; //保存分类数据