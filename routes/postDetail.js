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



/*
 * request params :
 * postId          String
 * member_token    headers
 */
router.get('/:postId', function(req, res) {
    var resultJson = {
        postDetail: {},
        postImgs: [],
        postImgsSize: 0,
        postLocation: {},
        writerInfo: {},
        isPicked: '',
        pickCount: -1
    };

    var select_post_detail_task = [
        //1. connection 가져오기
        function(callback) {
            pool.getConnection(function(err, connection) {
                if (err) {
                    console.log("getConnection error : ", err);
                    return callback(err, connection, null);
                } else return callback(null, connection);
            });
        },
        //2. 가져온 connection으로 query 실행 (이미 존재하는 회원인지 확인한다 select_query)
        function(connection, callback) {
            let select_notice_detail_query =
                "select * from notice_detail where post_id = ?";
            connection.query(select_notice_detail_query, req.params.postId, function(err, data) {
                if (err) {
                    console.log("select query error : ", err);
                    return callback(err, connection, null);
                } else {
                    if (data.length == 0) { //상세글 정보가 없음
                        return callback('ok', connection);
                    } else {
                        resultJson.postDetail.memberId = data[0].member_id;
                        resultJson.postDetail.title = data[0].title;
                        resultJson.postDetail.content = data[0].content;
                        resultJson.postDetail.servicePrice = data[0].price;
                        resultJson.postDetail.serviceTime = data[0].service_time;
                        resultJson.postDetail.typeCut = data[0].type_cut;
                        resultJson.postDetail.typeDye = data[0].type_dye;
                        resultJson.postDetail.typeEtc = data[0].type_ect;
                        resultJson.postDetail.typePerm = data[0].type_perm;
                        resultJson.postLocation.fullAddress = data[0].full_address;
                        resultJson.postLocation.sido = data[0].sido;
                        resultJson.postLocation.sigugun = data[0].sigugun;
                        resultJson.postLocation.dong = data[0].dong;
                        resultJson.postLocation.detail = data[0].detail;
                        resultJson.postLocation.latitude = data[0].latitude;
                        resultJson.postLocation.longitude = data[0].longitude;
                        resultJson.writerInfo.writerId = data[0].writer_id;
                        resultJson.writerInfo.writerImg = data[0].writer_photo;
                        resultJson.writerInfo.writerName = data[0].writer_name;
                        resultJson.writerInfo.writerBelongName = data[0].writer_belong_name;
                        resultJson.postImgsSize = data.length;
                        for (var x in data) {
                            let postPhoto = {};
                            postPhoto.img = data[x].notice_photo;
                            postPhoto.isMainImg = data[x].is_main;
                            resultJson.postImgs.push(postPhoto);
                        }
                        return callback(null, connection);
                    }
                }
            });
        },
        //3. pickcount 확인하기
        function(connection, callback) {
            let pick_count_query = "select * from pick_count_better where post_id = ?"
            connection.query(pick_count_query, req.params.postId, function(err, data) {
                if (err) {
                    console.log("select query error : ", err);
                    return callback(err, connection, null);
                } else {
                    if (data.length == 0) {
                    return callback('ok', connection);
                    } else {
                        resultJson.pickCount = data[0].count;
                        return callback(null, connection);
                    }
                }
            });
        },
        //4. isPicked 확인하기
        function(connection, callback) {
            let decoded = jwtModule.decodeToken(req.headers.member_token);
            let pick_status_query = "select * from pick where (member_id, post_id) = (?,?);"
            connection.query(pick_status_query, [decoded.memberId, req.params.postId], function(err, data) {
                if (err) {
                    console.log("select query error : ", err);
                    return callback(err, connection, null);
                } else {
                    if (data.length == 0) {
                        resultJson.isPicked = 'unpicked';
                    } else {
                        resultJson.isPicked = 'picked';
                    }
                    res.status(200).send(resultJson);
                    return callback(null, connection);
                }
            });
        },
        //5. connection release
        function(connection, callback) {
            connection.release();
            return callback(null, null, '-postDetail');
        }
    ];

    async.waterfall(select_post_detail_task, function(err, connection, result) {
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
            } else { //err=='ok' 인 경우
                res.status(200).send({
                    message: 'improper postId',
                    detail: 'no information about postDetail at postId:' + req.params.postId
                });
            }
        } else {
            //console.log(result);
        }
    });
});


/*
 * 작성자 (디자이너 마이 페이지) 로 가기
 * request params :
 * post_id
 */
router.get('/writer/:memberId', function(req, res) {
    var resultJson = {
        message: 'ok',
        designerInfo: {},
        designerPostList: [],
        designerPFPhoto: [],
        designerCareerText: '',
        designerCommentPostList: []

    };
    var decoded = jwtModule.decodeToken(req.headers.member_token);
    var select_writer_mypage_task = [
        //1. connection 가져오기
        function(callback) {
            pool.getConnection(function(err, connection) {
                if (err) {
                    console.log("getConnection error : ", err);
                    return callback(err, connection, null);
                } else return callback(null, connection);
            });
        },
        //2. 디자이너에 관한 정보들
        function(connection, callback) {
            //console.log()
            let select_designer_mypage_query =
                "select * from designer_mypage where member_id = ?";
            connection.query(select_designer_mypage_query, req.params.memberId, function(err, data) {
                if (err) {
                    console.log("select_designer_mypage_query query error : ", err);
                    return callback(err, connection, null);
                } else {
                    if (data.length !== 0) {
                        resultJson.designerInfo.memberPhoto = data[0].member_photo;
                        resultJson.designerInfo.statusMsg = data[0].status_msg;
                        resultJson.designerInfo.memberName = data[0].member_name;
                        resultJson.designerInfo.agvScore = data[0]['avg(score)'];
                        resultJson.designerCareerText = data[0].career_text;
                    }
                    return callback(null, connection);
                }
            });
        },
        //3. 디자이너 글 목록
        function(connection, callback) {
            let designer_post_list_query = "select * from designer_mypage_post_list where writer_id = ? order by written_time desc"
            connection.query(designer_post_list_query, req.params.memberId, function(err, data) {
                if (err) {
                    console.log("designer_post_list_query error : ", err);
                    return callback(err, connection, null);
                } else {
                    if (!data.length == 0) {
                        for (var x in data) {
                            var PostListData = {}
                            PostListData.postId = data[x].post_id;
                            PostListData.noticePhoto = data[x].notice_photo;
                            PostListData.servicePlace = data[x].sigugun;
                            PostListData.postTitle = data[x].title;
                            resultJson.designerPostList.push(PostListData);
                        }
                        return callback(null, connection);
                    }
                }
            });
        },
        //4. 디자이너 포트폴리오 사진
        function(connection, callback) {

            let designer_photo_list_query = "select * from designer_portfolio_imgs where member_id = ? order by reg_time desc;"
            connection.query(designer_photo_list_query, req.params.memberId, function(err, data) {
                if (err) {
                    console.log("designer_photo_list_query query error : ", err);
                    return callback(err, connection, null);
                } else {
                    if (data.length !== 0) {
                        for (var x in data) {
                            var photoList = {}
                            photoList.PFPhoto = data[x].member_photo;
                            resultJson.designerPFPhoto.push(photoList);
                        }
                    }
                    return callback(null, connection);
                }
            });
        },
        //5. 디자이너 후기 목록
        function(connection, callback) {

            let designer_comment_list_query = "select * from designer_comment_list where designer_id  = ? order by written_time desc;"
            connection.query(designer_comment_list_query, req.params.memberId, function(err, data) {
                if (err) {
                    console.log("designer_comment_list_query query error : ", err);
                    return callback(err, connection, null);
                } else {
                    if (data.length !== 0) {
                        for (var x in data) {
                            var commentList = {}

                            commentList.writerName = data[x].member_name;
                            commentList.title = data[x].title;
                            commentList.content = data[x].content;
                            commentList.commentPhoto = data[x].comment_photo;
                            commentList.score = data[x].score;
                            commentList.writtenTime = data[x].written_time;
                            resultJson.designerCommentPostList.push(commentList);
                        }
                    }
                    return callback(null, connection);
                }

            });
        },

        //5. connection release
        function(connection, callback) {
            connection.release();
            return callback(null, null, resultJson);
        }
    ];

    async.waterfall(select_writer_mypage_task, function(err, connection, result) {
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
          res.status(200).send(result);
        }
    });
});



router.post('/writePost', function(req, res) {
    //    console.log(req.body);
    var decoded = jwtModule.decodeToken(req.headers.member_token);
    let written_time = [moment(new Date()).format('YYYY-MM-DDTHH:mm:ssZ')];
    let post_id = "";
    let service_time = moment(req.body.serviceTime).format('YYYY-MM-DDTHH:mm:ssZ');

    var write_comment_task = [
        //1. connection 가져오기
        function(callback) {
            pool.getConnection(function(err, connection) {
                if (err) {
                    console.log("getConnection error : ", err);
                    return callback(err, connection, null);
                } else return callback(null, connection);
            });
        },
        // 상태 메세지 update
        function(connection, callback) {

            let write_post_query =
                "insert into NoticeBoard " +
                "(member_id, title, content, price, written_date, written_time, type_cut, type_dye, type_perm,type_ect, service_time) " +
                "values (?,?,?,?,?,?,?,?,?,?,?)";

            let written_date = [moment(new Date()).format('YYYY-MM-DD')];

            let record = [
                decoded.memberId,
                req.body.title,
                req.body.content,
                req.body.price,
                written_date,
                written_time,
                req.body.typeCut,
                req.body.typePerm,
                req.body.typeDye,
                req.body.typeEct,
                service_time
                //= STR_TO_DATE(req.body.serviceTime,'%Y-%m-%d %H:%i:%s')
            ];


            connection.query(write_post_query, record, function(err, data) {
                if (err) {
                    console.log("insert query error : ", err);
                    return callback(err, connection, null);
                } else {

                    return callback(null, connection);
                }
            });
        },
        function(connection, callback) {

            let select_post_id_query =
                "select post_id from NoticeBoard " +
                "where member_id = ? and written_time = ?"

            let record = [
                decoded.memberId,
                written_time,
            ];


            connection.query(select_post_id_query, record, function(err, data) {
                if (err) {
                    console.log("insert query error : ", err);
                    return callback(err, connection, null);
                } else {
                  post_id = data[0].post_id
                    res.status(201).send({
                        message: 'ok',
                        postId: data[0].post_id
                    });
                    return callback(null, connection);
                }
            });
        },
//장소저장
        function(connection, callback) {

            let insert_place_query =
            "insert into Place " +
            "(post_id, sido, sigugun, latitude, longitude, full_address) " +
            "values (?,?,?,?,?,?)";

            let record = [
                post_id,
                req.body.sido,
                req.body.sigugun,
                req.body.latitude,
                req.body.longitude,
                req.body.fullAddress
            ];


            connection.query(insert_place_query, record, function(err, data) {
                if (err) {
                    console.log("insert query error : ", err);
                    return callback(err, connection, null);
                } else {
                    return callback(null, connection);
                }
            });
        },


        //5. connection release
        function(connection, callback) {
            connection.release();
            return callback(null, null, 'writePost');
        }
    ];

    async.waterfall(write_comment_task, function(err, connection, result) {
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
// 개시글 사진등록
router.post('/writePostPhoto', upload.single('image'), function(req, res) {


    let is_main = 0;
    var insert_designer_PF_task = [
        //1. connection 가져오기
        function(callback) {
            pool.getConnection(function(err, connection) {
                if (err) {
                    console.log("getConnection error : ", err);
                    callback(err, connection, null);
                } else callback(null, connection);
            });
        },
        // 대표사진인지 아닌지 확인
        function(connection, callback) {
            let select_is_main_query =
                "select notice_photo from noticePhoto " +
                "where post_id = ? "
            let record = [
                req.body.postId
            ];

            connection.query(select_is_main_query, record, function(err, data) {
                if (err) {
                    console.log("select_is_main_query : ", err);
                    callback(err, connection, null);
                } else {
                    if (data.length == 0) {
                        is_main = 1;
                    } else {
                        is_main = 0;
                    }

                    callback(null, connection);
                }
            });
        },
        // 개시글 사진 등록
        function(connection, callback) {
            let insert_post_photo_query =
                "insert  into noticePhoto (post_id , notice_photo , is_main )" +
                "values (?, ? , ?)"

            if (!req.file) imageUrl = null;
            else imageUrl = req.file.location;


            let record = [
                req.body.postId,
                imageUrl,
                is_main
            ];


            connection.query(insert_post_photo_query, record, function(err, data) {
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
            callback(null, null, 'designerPF');
        }
    ];

    async.waterfall(insert_designer_PF_task, function(err, connection, result) {
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
