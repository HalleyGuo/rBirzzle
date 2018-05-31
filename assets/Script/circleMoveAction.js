/**
 * 自定义抖动动作
 */
var CircleMoveAction = cc.ActionInterval.extend({
    //圆心位置
    centerPos: cc.p(0, 0),
    //运动缩放
    scaleDiff:0,
    //当前运动缩放
    currentScale:0,
    //抖动时间
    duration:0,
    deltTime: 0,
    //角度
    angle: 0,
    anglePreFrame: 0,
    frameCnts: 0,
    ctor:function(duration,center,scale, angle){
        cc.ActionInterval.prototype.ctor.call(this);
        this.duration = duration;
        this.initWithDuration(duration, center, scale, angle);

    },
    update:function(dt){
        this.frameCnts++;
        this.currentScale += this.scaleDiff;

        var newPos = cc.pRotateByAngle(this.nodeInitialPos, this.centerPos, this.frameCnts * this.anglePreFrame);
        var diff = cc.pSub(newPos, this.centerPos);
        newPos = cc.pAdd(diff.mulSelf(this.currentScale), this.centerPos);

       this.target.setPosition(newPos);
    },
    initWithDuration:function(duration, center, scale, angle){
        if (cc.ActionInterval.prototype.initWithDuration.call(this, duration)) {
            this.centerPos = center;
            this.scaleDiff = scale;
            this.angle = angle;
            this.currentScale = 1.0;
            this.anglePreFrame = angle / duration * cc.director.getAnimationInterval() / (180 / Math.PI);
            this.frameCnts = 0;

            return true;
        }
        return false;
    },
    startWithTarget:function(target){
        cc.ActionInterval.prototype.startWithTarget.call(this, target);
        this.nodeInitialPos=target.getPosition();
    },
    stop:function(){
        this.target.setPosition(this.nodeInitialPos);
    }
});
/**
 * 自定义圆周运动动作
 * @param {float}duration 抖动时间
 * @param {number}center 圆心
 * @param {number}scale 每帧差值
 * @param {number}angle 运动角度
 * @returns {Shake}
 */
cc.circleMoveAction = function(duration, center, scale, angle){
    return new CircleMoveAction(duration, center, scale, angle);
};
