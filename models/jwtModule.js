const jwt = require('jsonwebtoken');
const jwtSecret = require('../config/secretKey');
const secretKey = jwtSecret.secret;

//JWT 토큰 설정값
const option = {
  algorithm : 'HS256',        //토큰 암호화 방식
  expiresIn : 60 * 60 * 24    //토큰의 유효기간
};
const payload = {
  memberId : 0,               //member_id
};

//토큰 발급하기
function makeToken (value) {
  if(!value.member_id){
    value.member_id = 0;
  }
  payload.memberId = value.member_id;
  var token = jwt.sign(payload, secretKey, option);
  return token;
}

//토큰 해석하기
function decodeToken (token) {
    //decoded.memberId 로 memberId를 참고할 수 있다.
    var decoded = jwt.verify(token, secretKey);
    return decoded;
}

module.exports.makeToken = makeToken;
module.exports.decodeToken = decodeToken;
