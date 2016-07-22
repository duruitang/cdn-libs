// 引入 配置
var config = require('./config.json');

// 路径
var dist_path = 'dist/'+ config.domain +'/' + config.date + '/';

// 文件源
var css_src = [
        'libs/vux/0.1.2/vux.css'
    ],
    font_src = [

    ],
    js_src = [
        'libs/jquery/3.1.0/jquery.js',
        'libs/fastclick/1.0.6/fastclick.js',
        'libs/vue/1.0.26/vue.js',
        'libs/vue-router/0.7.13/vue-router.js'
    ];

// 上传队列
var upload_queue = [];

// 引入组件
var gulp = require('gulp'),
    clean = require('gulp-clean'), // 文件清理删除
    clean_css = require('gulp-clean-css'), // css压缩
    uglify = require('gulp-uglify'), // js压缩
    concat = require('gulp-concat'), // 文件合并
    rename = require('gulp-rename'), // 文件更名
    co = require('co'), // 配合OSS
    OSS = require('ali-oss'); // 阿里云OSS


// 任务：清理旧文件
gulp.task('clean', function () {
    console.log('========== 清理文件任务开始 ==========');
    return gulp.src(dist_path + '*')
        .pipe(clean({force: true}));
});

// 任务：复制字体文件
gulp.task('copy', ['clean'], function () {
    console.log('========== 复制文件任务开始 ==========');
    return gulp.src(font_src)
        .pipe(gulp.dest(dist_path + 'fonts'));
});

// 任务：合并、压缩、重命名css
gulp.task('minify_css', ['copy'], function () {
    console.log('========== CSS部署任务开始 ==========');
    upload_queue.push('css/base.min.css');
    return gulp.src(css_src)
        .pipe(concat('base.css'))
//        .pipe(md5(9))
        .pipe(gulp.dest(dist_path + 'css'))
        .pipe(rename({suffix: '.min'}))
        .pipe(clean_css())
        .pipe(gulp.dest(dist_path + 'css'));
});

// 任务：JS语法检查

// 任务：压缩、合并js
gulp.task('minify_js', ['minify_css'], function(){
    console.log('========== JS部署任务开始 ==========');
    upload_queue.push('js/base.min.js');
    return gulp.src(js_src)
        .pipe(concat('base.js', {newLine: ';'}))
//        .pipe(md5(9))
        .pipe(gulp.dest(dist_path + 'js'))
        .pipe(rename({suffix: '.min'}))
        .pipe(uglify())
        .pipe(gulp.dest(dist_path + 'js'));
});

// 任务：上传至阿里云OSS
gulp.task ('up_to_oss', ['minify_js'], function(){
    console.log('========== 上传至阿里云OSS任务开始 ==========');
    // 配置
    var client = new OSS({
        accessKeyId: config.ak,
        accessKeySecret: config.sk,
        region: config.region,
        secure: true,
        timeout: 9*1000
    });
    // 上传
    co(function* () {
        client.useBucket(config.bucket); // 配置bucket
        // 循环上传队列文件
        for (var i=0; i<upload_queue.length; i++) {
            yield client.put(
                dist_path + upload_queue[i],
                dist_path + upload_queue[i]
            );
        }
    }).catch(function (err) {
        console.log(err);
    });
});

// 默认的任务
gulp.task('default', ['up_to_oss'], function(){
    console.log('========== 全部部署任务完成 ==========');
    return true;
});
