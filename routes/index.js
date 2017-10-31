var express = require('express');
var router = express.Router();
var path = require('path');
var async = require('async');
var category = require('../proxy/category');
var tool = require('../utility/tool');

router.get('/', function (req, res, next)
{
    var paraTasks =//并行任务
        [
            mGetConfigCreator(),//获取配置生成器
            mGetCategoriesCreator()//获取分类任务生成器
        ]
    async.parallel(paraTasks, function (err, results)
    {
        if (err)
        {
            next(err);
        } else
        {
            /*渲染首页*/
            mRendIndex(results)
        }
    });
});

/**
* 渲染首页
 * @param paraResults {Array} 并行任务结果集
**/
function mRendIndex(paraResults)
{
    var settings= paraResults[0],
        categories= paraResults[1];
    res.render('blog/index', {
        cateData: categories,
        config: settings,
        title: settings['SiteName'],
        currentCate: '',
        isRoot: true
    });
}

/**
 * 获取配置生成器
 **/
function mGetConfigCreator()
{
    //获取配置
    return function mGetConfig(cb)
    {
        tool.getConfig(path.join(__dirname, '../config/settings.json'), function (err, settings)
        {
            if (err)
            {
                cb(err);
            } else
            {
                cb(null, settings);
            }
        });
    };
}

/**
* 获取分类任务生成器
**/
function mGetCategoriesCreator()
{
    //获取分类
    return function mGetCategories(cb)
    {
        category.getAll(function (err, categories)
        {
            if (err)
            {
                cb(err);
            } else
            {
                cb(null, categories);
            }
        });
    }
}

module.exports = router;
