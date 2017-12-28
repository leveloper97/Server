const mysql = require('mysql');
const pool = require('../config/db_pool');
const express = require('express');
const aws = require('aws-sdk');
const router = express.Router();
const multer = require('multer');
const multerS3 = require('multer-s3');
const moment = require('moment');
const async = require('async');
const jwtModule = require('../models/jwtModule');
aws.config.loadFromPath('../config/aws_config.json');
const s3 = new aws.S3();
const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: 'freety-storage',
        acl: 'public-read',
        key: function(req, file, cb) {
            cb(null, Date.now() + '.' + file.originalname.split('.').pop())
        }
    })
});


/* request params :
* title           String
* content         String
* price            int
* typeCut          0/1 int
* typeDye          0/1 int
* typePerm         0/1 int
* typeEtc          0/1 int
* serviceTime     Date
*
*
*
*/
router.post('/write', upload.single('image'), function(req, res) {

    var decoded = jwtModule.decodeToken(req.headers.member_token);

    var write_post_task = [
        //1. connection 가져오기
        function(callback) {
            pool.getConnection(function(err, connection) {
                if (err) {
                    console.log("getConnection error : ", err);
                    callback(err, connection, null);
                } else callback(null, connection);
            });
        },
        // 상태 메세지 update
        function(connection, callback) {

          var title = req.body.title;
          var content = req.body.content;
          var price = req.body.price;
          var typeCut = req.body.typeCut;
          var typePerm = req.body.typePerm;
          var typeDye = req.body.typeDye;
          var typeEct = req.body.typeEct;
          var service_time = req.body.serviceTime;
          var member_id = decoded.memberId;
          var written_date = [moment(new Date()).format('YYYY-MM-DD')];
          var written_time = [moment(new Date()).format('YYYY-MM-DD HH:MM:SS')];
          let write_post_query =
              "insert into NoticeBoard (member_id, title, content, price, type_cut, type_perm, type_dye, type_ect, service_time, written_date, written_time) values ("+member_id+",'"+title+"','"+content+"', '"+price+"', '"+typeCut+"', '"+typePerm+"','"+typeEct+"', '"+typeDye+"','"+service_time+"', '"+written_date+"','"+written_time+"')";
          if (!req.file) imageUrl = null;
            else imageUrl = req.file.location;
          let record = "";
          connection.query(write_post_query, record, function(err, data) {
              if (err) {
                    console.log("insert query error : ", err);
                    callback(err, connection, null);
                } else {
                    res.status(201).send({
                        message: 'ok'
                    });
                    callback(null, connection);
                }
            });
        },


        //5. connection release
        function(connection, callback) {
            connection.release();
            callback(null, null, 'POST IS INSERTED');
        }
    ];

    async.waterfall(write_post_task, function(err, connection, result) {
        if (connection) {
            connection.release();
        }

        if (err) {
            if (err != 'ok') {
                console.log("async.waterfall error : ", err);
                res.status(503).send({
                    message: 'failure',
                    detail: 'internal server error'
                });
            }
        } else {
            console.log(result);
        }
    });
});
module.exports = router;
