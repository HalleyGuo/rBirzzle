var EnumData = require("EnumData");

cc.Class({
    extends: cc.Component,

    properties: {
        spriteIcon:{
            default: [],
            type: cc.SpriteFrame,
        },

        blinkIcon: {
            default: [],
            type: cc.SpriteFrame,
        },

        fireBirdBlackIcon: {
            default: [],
            type: cc.SpriteFrame,
        },

        bombEffectIcon: {
            default: [],
            type: cc.SpriteFrame,
        },

        fireBirdEffectIcon: {
            default: [],
            type: cc.SpriteFrame,
        },

        lightningEffectIcon: {
            default: [],
            type: cc.SpriteFrame,
        },

        blackHoleEffectIcon: {
            default: [],
            type: cc.SpriteFrame,
        },
        effctNode: cc.Node,
    },

    // LIFE-CYCLE CALLBACKS:

    onLoad () {
        this.isLinked = false;

        //添加帧动画
        var animation = this.effctNode.getComponent(cc.Animation);
        var clip = cc.AnimationClip.createWithSpriteFrames(this.bombEffectIcon, 12);
        clip.name = "bomb";
        clip.wrapMode = cc.WrapMode.Loop;
        animation.addClip(clip);

        clip = cc.AnimationClip.createWithSpriteFrames(this.fireBirdEffectIcon, 12);
        clip.name = "fireBird";
        clip.wrapMode = cc.WrapMode.Loop;
        animation.addClip(clip); 
        
        clip = cc.AnimationClip.createWithSpriteFrames(this.lightningEffectIcon, 12);
        clip.name = "lightning";
        clip.wrapMode = cc.WrapMode.Loop;
        animation.addClip(clip); 
        
        clip = cc.AnimationClip.createWithSpriteFrames(this.blackHoleEffectIcon, 12);
        clip.name = "blackHole";
        clip.wrapMode = cc.WrapMode.Loop;
        animation.addClip(clip);
        this.setItemType(this.itemType);
        // frames 这是一个 SpriteFrame 的数组.
        var frames = [this.spriteIcon[this.itemType], this.blinkIcon[this.itemType],
            this.spriteIcon[this.itemType]];
        var clip = cc.AnimationClip.createWithSpriteFrames(frames, 8);
        clip.name = "blink";
        clip.wrapMode = cc.WrapMode.Normal;
    
        animation.addClip(clip);
        this.setTriggerState(this.ItemTriggerStateEnum);
    },

    start () {

        //this.effctNode.getComponent(cc.Animation).play("bomb");
        //this.effctNode.removeComponent(cc.Sprite);
    },

    //设置元素类型
    setItemType:function(itemType) {
        this.itemType = itemType;
        
        this.node.getComponent(cc.Sprite).spriteFrame = this.spriteIcon[itemType];

        this.scheduleOnce(function(){
            this.delayPlayBlinkAnim();
        },3 + 8 * Math.random());
    },

    //获取元素类型
    getItemType: function() {
        return this.itemType;
    },

    //设置元素触发状态类型
    setTriggerState:function(triggerState) {
        this.ItemTriggerStateEnum = triggerState;
        var clipName = "";
        switch(triggerState) {
            case EnumData.ItemTriggerStateEnum.Normal: {
                break;
            }
            case EnumData.ItemTriggerStateEnum.Bomb: {
                clipName = "bomb";
                break;
            }
            case EnumData.ItemTriggerStateEnum.FireBird: {
                clipName = "fireBird";
                break;
            }
            case EnumData.ItemTriggerStateEnum.Lightning: {
                clipName = "lightning";
                break;
            }
            case EnumData.ItemTriggerStateEnum.BlackHole: {
                clipName = "blackHole";
                break;
            }
            default: {
                break;
            }
        }
        if (clipName != "") {
            this.effctNode.getComponent(cc.Animation).play(clipName);
        }
        if (this.ItemTriggerStateEnum == EnumData.ItemTriggerStateEnum.Normal) {
            this.effctNode.removeComponent(cc.Sprite);
        }
    },

    //获取元素类型
    getTriggerState: function() {
        return this.ItemTriggerStateEnum;
    },

    //延迟调用眨眼动画
    delayPlayBlinkAnim: function() {
        this.schedule(function(){
            this.playBlinkAnim();
       }, 13 - Math.random() * 3);
    },

    //播放眨眼动画
    playBlinkAnim: function(){
        var animation = this.node.getComponent(cc.Animation);
        animation.play('blink');
    },

    //位置相关
    setPos: function(column, row) {
        this.column = column;
        this.row = row;
    },

    getColumn: function() {
        return this.column;
    },

    getRow: function() {
        return this.row;
    },

    getIsLinked: function() {
        return this.isLinked;
    },

    setIsLinked: function(isLinked) {
        this.isLinked = isLinked;
    },

    //转变为黑色形象，用于火鸟触发显示
    turnFireBirdBlack: function() {
        this.node.getComponent(cc.Sprite).spriteFrame = this.fireBirdBlackIcon[this.itemType];
        this.unscheduleAllCallbacks();
    }

    // update (dt) {},
});
