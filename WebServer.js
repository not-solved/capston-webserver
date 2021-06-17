var wsServer = require('ws');
var wss = new wsServer.Server({port: 6010});

var UserList = [];
var NameList = [];
var BombList = [];
var container = {};
UserCount = 0;
SmallBombCnt = 0;
MediumBombCnt = 0;
LargeBombCnt = 0;

const latitudeRate = 111200;       //  latitude 1 차이 : 111.20km 차이 (1112000m)
const longitudeRate = 88270;       //  longitude 1 차이 : 88.27km 차이 (882700m)
var isDetected = false;
var isSended = false;

function calculateDistance(userLatitude, userLongitude, bombLatitude, bombLongitude) {
    return Math.sqrt((Math.pow(userLatitude - bombLatitude)*latitudeRate, 2) + Math.pow((userLongitude - bombLongitude)*longitudeRate, 2));
}

container = {
    com : "",
    bombCode : "",
    bombID : "",
    installUser : "",
    latitude : 0,
    longitude : 0,
    InjectTime : "",
    ExploseTime : ""
}

//  클라이언트 연결
wss.on('connection', (client) => {
    console.log("Connection detected");

    //  메시지 수신시
    client.on('message', (message) => {
        rcvMsg = JSON.parse(message);
        if(rcvMsg.com == "InitialConnection") {
            //  이름 중복 검사  
            isDuplicated = false;
            NameList.forEach((users, index, array) => {
                if(users == rcvMsg.installUser) {
                    container.com = "NameDuplicated";
                    client.send(JSON.stringify(container));
                    console.log("Name Duplicated");
                    isDuplicated = true;
                }
            });

            //  중복검사 통과 시 게임 화면으로 연결
            if(!isDuplicated) {
                container.com = "Connect";
                container.installUser = rcvMsg.installUser;
                
                client.send(JSON.stringify(container));
                UserList.push(client);    
                NameList.push(rcvMsg.installUser);
                console.log('Hello ' + container.installUser);    
                UserCount++;
            }
            return;
        }
        
        console.log("================================================");
        console.log('message from client : ', rcvMsg.com);
        if(rcvMsg.com == 'Inject') {            //  폭탄 설치일 경우
            isSended = false;
            BombList.forEach((item, index, array) => {
                if(calculateDistance(rcvMsg.latitude, rcvMsg.longitude, item.latitude, item.longitude) <= 10) {
                    container.com = 'inject';
                    container.bombCode = 'Failed';
                    container.installUser = calculateDistance(rcvMsg.latitude, rcvMsg.longitude, item.latitude, item.longitude).toString();
                    client.send(JSON.stringify(container));
                    isSended = true;
                }
            })
            if(!isSended) {
                container = {
                    com : 'inject',
                    bombCode : rcvMsg.bombCode,
                    bombID : rcvMsg.bombCode,
                    installUser : rcvMsg.installUser,
                    latitude : rcvMsg.latitude,
                    longitude : rcvMsg.longitude,
                    InjectTime : rcvMsg.InjectTime,
                    ExploseTime : rcvMsg.ExploseTime
                }
                if(rcvMsg.bombCode == 'Small')
                    container.bombID += SmallBombCnt++;
                else if(rcvMsg.bombCode == 'Medium')
                    container.bombID += MediumBombCnt++;
                else
                    container.bombID += LargeBombCnt++;
                
                console.log(container.bombID);
                client.send(JSON.stringify(container));
                BombList.push(container);
                console.log("Left Bombs : " + BombList.length);    
            }
        } 
        else if(rcvMsg.com == 'Search') {       //  주변 탐지일 경우
            userLatitude = rcvMsg.latitude;
            userLongitude = rcvMsg.longitude;

            isDetected = false;
            BombList.forEach((item, index, array) => {
                if( calculateDistance(userLatitude, userLongitude, item.latitude, item.longitude) <= 50
                    && item.installUser != rcvMsg.installUser) {
                    isDetected = true;
                    dist = calculateDistance(userLatitude, userLongitude, item.latitude, item.longitude);
                    console.log('Bomb detected : ' + dist);
                    container = item;
                    container.com = 'search';
                    client.send(JSON.stringify(container));
                }
            });

            if(!isDetected) {
                container.com = 'search';
                container.bombCode = 'NoBomb';
                client.send(JSON.stringify(container));
            }
        }
        else if(rcvMsg.com == 'Explose') {      //  폭탄 폭발일 경우
            container = {
                com : 'explose',
                bombCode : rcvMsg.bombCode,
                bombID : rcvMsg.bombID,
                installUser : rcvMsg.installUser,
                latitude : rcvMsg.latitude,
                longitude : rcvMsg.longitude,
                InjectTime : rcvMsg.InjectTime,
                ExploseTime : rcvMsg.ExploseTime
            };
            console.log("================================================");
            console.log("Explose Bomb : " + rcvMsg.bombID);
            console.log("Bomb' owner : ", rcvMsg.installUser);
            console.log("Explose latitude : " + rcvMsg.latitude);
            console.log("Explose longitude : " + rcvMsg.longitude);
            //  폭발 좌표를 유저들에게 전송
            UserList.forEach((user, index, array) => {
                user.send(JSON.stringify(container));
            });

            //  폭발한 폭탄 리스트에서 제거
            targetIdx = 0;
            for(i = 0; i < BombList.length; i++) {
                if(BombList[i] == rcvMsg.bombCode) {
                    targetIdx = i;
                    break;
                }
            }
            BombList.splice(targetIdx, 1);
        }
        else if(rcvMsg.com == 'Remove') {       //  폭탄을 제거하는 경우
            removeComplete = false;
            console.log("================================================");
            console.log("User : ", rcvMsg.installUser);
            for(i = 0; i < BombList.length; i++) {
                if(BombList[i].bombID == rcvMsg.bombID) {
                    container = BombList[i];
                    container.com = "remove";
                    UserList.forEach((users, index, array) => {
                        users.send(JSON.stringify(container));
                    });
                    console.log("Target Bomb name : ", rcvMsg.bombID);
                    removeComplete = true;
                    break;
                }
            }

            if(!removeComplete) {               //  서버에 기록이 없는데 클라이언트에 오브젝트가 존재할 경우
                console.log("No such bomb remained");
                container.com = "remove_noSuchBomb"
                client.send(JSON.stringify(container));
            }
            //  제거한 폭탄 리스트에서 제거
            targetIdx = 0;
            for(i = 0; i < BombList.length; i++) {
                if(BombList[i] == rcvMsg.bombCode) {
                    targetIdx = i;
                    break;
                }
            }
            BombList.splice(targetIdx, 1);            
        }
        else if(rcvMsg.com == 'Attacked') {     //  누군가 폭발에 휩쓸리는 경우
            console.log("================================================");
            console.log("Someone is attacked");
            for(i = 0; i < UserList.length; i++) {

                //  폭탄 주인에게 유저의 피격 정보를 전송
                if(NameList[i] == rcvMsg.installUser) {
                    container.com = "attack";
                    UserList[i].send(JSON.stringify(container));
                    break;
                }
            }
        }
    });

    //  클라이언트 연결 해제 ==> 리스트에서 클라이언트 제거
    client.on('close', () => {
        targetIdx = 0;
        ClientName = '';
        for(i = 0; i < UserList.length; i++) {
            if(UserList[i] == client) {
                targetIdx = i;
                ClientName = UserList[i];
                break;
            }
        }
        UserList.splice(targetIdx, 1);
        NameList.splice(targetIdx, 1);

        //  해당 폭탄의 정보를 모든 유저에게 전송한 후 리스트에서 제거
        for(i = BombList.length - 1; i >= 0; i--) {
            if(BombList[i].installUser == ClientName) {
                container = BombList[i];
                container.com = "SessionOut";

                //  Session Out - 세션 아웃된 유저의 폭탄 정보를 게임에서 제외
                UserList.forEach((users, index, array) => {
                    users[0].send(JSON.stringify(container));
                });
                BombList.splice(i, 1);
            }
        }
        console.log(ClientName + ' disconnected');
    });
});

console.log('Server is opened on port 6010');