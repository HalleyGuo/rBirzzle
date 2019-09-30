var EnumData = require("EnumData");

var linkCreateNum = {
    BlackHole: 7,
    Lightning: 6,
    FireBird: 5,
    Bomb: 4,
}
cc.Class({
    extends: cc.Component,
    properties: {
        maxRow: 9,
        maxColumn: 7,
        itemWidth: 75,
        itemHeight: 80,
        itemFallTime: 0.02,
        itemRiseTime: 0.2,
        itemMinLinkNum: 3,
        linkedTriggerTime: 2,
        newItemFallTime: 10,
        newItemFallAlarmTime: 2,
        topLineCreateHeight: 800,
        itemElimateTime: 0.1,
        itemPrefab: cc.Prefab,
        itemEffectNode: cc.Node,
        lockBreakAnim: cc.Prefab,
        fireBirdEffctAnim: cc.Prefab,
        blackHoleTriggerEffectAnim: cc.Prefab,
        lightningEffectNode: cc.Prefab,
        skullSprite: cc.Prefab,
        scoreLabel: cc.Prefab,
        blackHoleElimateNum: 30,
        totalScoreLabel: cc.Node,
    },

    // LIFE-CYCLE CALLBACKS:

    onLoad() {
        //加载关卡配置数据
        this.levelConfig = new Array;
        this.loadLevelConfigJson();
        this.readGameConfigJson();
        //创建元素
        this.linkedInfoArr = new Array;

        this.itemArray = new Array(this.maxRow);
        this.fallingItemArr = new Array(this.maxRow);
        this.topNewLineArr = new Array(this.maxColumn);
        this.topLineDropWaitingTime = -3;
        this.isGamePaused = true;
        this.isTopLineShaking = false;
        this.isFirstTimeFall = true;
        this.score = 0;
    },

    start() {
    },

    //配置数据读取完成回调函数
    onConfigDataRead: function () {

        //等级相关属性
        this.currentLevel = 1;     //当前等级
        this.preLevelsScore = 0;   //前面等级总分数
        this.totalScore = 0;       //获得的总分数
        this.currentLevelConfig = this.levelConfig[0];   //当前关卡配置数据
        this.isGamePaused = false;


        for (var i = this.maxRow - 1; i >= 0; --i) {
            this.itemArray[i] = new Array(this.maxColumn);
            this.fallingItemArr[i] = new Array(this.maxColumn);
            for (var j = this.maxColumn - 1; j >= 0; --j) {
                if (i + j > 7) {
                    continue;
                }

                var itemInstant = cc.instantiate(this.itemPrefab);
                itemInstant.getComponent("item").setItemType(this.getNewItemType());
                itemInstant.getComponent("item").setTriggerState(Math.random() < this.currentLevelConfig.lockProbability ? EnumData.ItemTriggerStateEnum.Lock : EnumData.ItemTriggerStateEnum.Normal);
                //itemInstant.getComponent("item").setTriggerState( EnumData.ItemTriggerStateEnum.Normal);
                itemInstant.parent = this.node;

                itemInstant.getComponent("item").setPos(j, i);
                itemInstant.setPosition(cc.v2(j * this.itemWidth + this.itemWidth / 2,
                    - this.itemHeight / 2));
                this.fallingItemArr[i][j] = itemInstant;

                itemInstant.runAction(cc.sequence(cc.delayTime(this.itemRiseTime * (2 - i)),
                    cc.moveBy(this.itemRiseTime * (i + 1), cc.v2(0, (i + 1) * this.itemHeight)),
                    cc.callFunc(this.fallingItemToGrand, this, [j, i, 0])));
            }

        }

        //添加触摸监听
        this.node.on(cc.Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(cc.Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(cc.Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(cc.Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
        this.scheduleOnce(this.createNewLineOnTop, 2);
    },

    update(dt) {
        if (!this.isGamePaused) {
            //更新游戏时间
            this.topLineDropWaitingTime += dt;
            //检查顶部新元素是否下落
            var itemFallWaitingTime = this.currentLevelConfig.firstFallTime;
            if (!this.isFirstTimeFall) {
                itemFallWaitingTime = this.currentLevelConfig.secondFallTime;
            }
            if (this.topLineDropWaitingTime >= itemFallWaitingTime - 2 && !this.isTopLineShaking) {
                this.isTopLineShaking = true;
                this.topNewLineShake();
            }
            if (this.topLineDropWaitingTime >= itemFallWaitingTime) {
                this.topNewLineFall();
                this.isTopLineShaking = false;
                this.isFirstTimeFall = false;
            }

            //增加连接数组连接时间
            var posArr = new Array;
            for (var i = 0; i < this.linkedInfoArr.length; ++i) {
                var linkedInfo = this.linkedInfoArr[i];
                linkedInfo.time += dt;

                //连接元素可以触发
                if (linkedInfo.time >= this.currentLevelConfig.linkTriggerTime) {
                    this.triggerLinkedItemList(linkedInfo.arr);

                    this.linkedInfoArr.splice(i, 1);
                    --i;
                }
            }

            //检查是否需要底部生成
            //this.checkIfCreateLineInBottom();
        }
    },

    //触摸相应函数
    onTouchStart: function (event) {
        //根据触摸位置获取触摸元素
        /*
        var touches = event.getTouches();
        var touchPos = event.getLocation();
        var touchPos = this.node.convertToNodeSpaceAR(touchPos);
        var touchedItem = this.getTouchedItemByPos(touchPos);
        if(this.isTouchedItemCanMove(touchedItem)) {
            this.movedItem = touchedItem;

            var movedColumn = this.movedItem.getComponent("item").getColumn();
            var movedRow = this.movedItem.getComponent("item").getRow();
            this.itemArray[movedRow][movedColumn] = null;
            this.checkFallItemsByColumn(movedColumn, movedRow);
        }*/
    },

    //触摸移动相应函数
    onTouchMove: function (event) {
        //根据触摸位置获取触摸元素
        var touches = event.getTouches();
        if (touches.length <= 0) {
            return;
        }
        var touchPos = event.getLocation();
        var touchPos = this.node.convertToNodeSpaceAR(touchPos);

        if (this.movedItem == null) {
            var touchedItem = this.getTouchedItemByPos(touchPos);
            if (this.isTouchedItemCanMove(touchedItem)) {
                this.movedItem = touchedItem;

                var movedColumn = this.movedItem.getComponent("item").getColumn();
                var movedRow = this.movedItem.getComponent("item").getRow();
                this.itemArray[movedRow][movedColumn] = null;
                this.checkFallItemsByColumn(movedColumn, movedRow);
            }
        }

        if (this.movedItem == null) {
            return;
        }

        //超出边界设置边界范围
        if (touchPos.x < this.itemWidth / 2) {
            touchPos.x = this.itemWidth / 2;
        }
        if (touchPos.y < this.itemHeight / 2) {
            touchPos.y = this.itemHeight / 2;
        }
        if (touchPos.x >= this.itemWidth * this.maxColumn - this.itemWidth / 2) {
            touchPos.x = this.itemWidth * this.maxColumn - this.itemWidth / 2;
        }
        if (touchPos.y >= this.itemHeight * this.maxRow - this.itemHeight / 2) {
            touchPos.y = this.itemHeight * this.maxRow - this.itemHeight / 2;
        }

        //根据触摸位置计算可以到达位置
        var xMinus = -1;
        var yMinus = -1;
        var touchedColumn = Math.floor(touchPos.x / this.itemWidth);
        var touchedRow = Math.floor(touchPos.y / this.itemHeight);

        if (touchPos.x - (touchedColumn + 0.5) * this.itemWidth > 0) {
            xMinus = 1;
        }
        if (touchPos.y - (touchedRow + 0.5) * this.itemHeight > 0) {
            yMinus = 1;
        }

        var itemPos = touchPos;
        //cc.log(touchPos);
        //触摸位置没有元素
        if (this.checkIsEmptyByColumn(touchedColumn, touchedRow)) {
            if (!this.checkIsEmptyByColumn(touchedColumn + xMinus, touchedRow)) {
                itemPos.x = this.getPosByColumn(touchedColumn, touchedRow).x;
            }
            if (!this.checkIsEmptyByColumn(touchedColumn, touchedRow + yMinus)) {
                itemPos.y = this.getPosByColumn(touchedColumn, touchedRow).y;
            }

            if (!this.checkIsEmptyByColumn(touchedColumn + xMinus, touchedRow + yMinus)) {
                if (this.checkIsEmptyByColumn(touchedColumn, touchedRow + yMinus) &&
                    this.checkIsEmptyByColumn(touchedColumn + xMinus, touchedRow)) {
                    if (Math.abs(touchPos.x - (touchedColumn + (xMinus + 1.0) / 2) * this.itemWidth) >=
                        Math.abs(touchPos.y - (touchedRow + (yMinus + 1.0) / 2) * this.itemHeight)) {
                        itemPos.x = this.getPosByColumn(touchedColumn, touchedRow).x;
                    }
                    else {
                        itemPos.y = this.getPosByColumn(touchedColumn, touchedRow).y;
                    }
                }
            }

            this.movedItem.setPosition(itemPos);
        }
        else {
            //左右上的位置分别为0,1,2
            //给到这些位置的距离排序
            var indexArr = new Array;
            var lengthArr = [touchPos.x % this.itemWidth,
            this.itemWidth - touchPos.x % this.itemWidth,
            this.itemHeight - touchPos.y % this.itemHeight];
            if (lengthArr[0] >= lengthArr[1]) {
                if (lengthArr[1] >= lengthArr[2]) {
                    indexArr = [2, 1, 0];
                }
                else if (lengthArr[2] > lengthArr[0]) {
                    indexArr = [1, 0, 2];
                }
                else {
                    indexArr = [1, 2, 0];
                }
            }
            else {
                if (lengthArr[0] >= lengthArr[2]) {
                    indexArr = [2, 0, 1];
                }
                else if (lengthArr[2] > lengthArr[1]) {
                    indexArr = [0, 1, 2];
                }
                else {
                    indexArr = [0, 2, 1];
                }
            }

            //左上，右上作为3, 4加入
            if (xMinus < 0) {
                indexArr[3] = 3;
                indexArr[4] = 4;
            }
            else {
                indexArr[3] = 4;
                indexArr[4] = 3;
            }

            //判断每个位置是否有元素
            var putIndex = -1;
            for (var i = 0; i < indexArr.length; ++i) {
                var pos = indexArr[i];
                var xPlus = 0;
                var yPlus = 0;
                if (pos == 0) {
                    xPlus = -1;
                }
                else if (pos == 1) {
                    xPlus = 1;
                }
                else if (pos == 2) {
                    yPlus = 1;
                }
                else if (pos == 3) {
                    xPlus = -1;
                    yPlus = 1;
                }
                else if (pos == 4) {
                    xPlus = 1;
                    yPlus = 1;
                }
                if (this.checkIsEmptyByColumn(touchedColumn + xPlus, touchedRow + yPlus)) {
                    putIndex = i;
                    break;
                }
            }
            //找到一个位置
            if (putIndex != -1) {
                var index = indexArr[putIndex];
                switch (index) {
                    case 0: {
                        itemPos = this.getPosByColumn(touchedColumn - 1, touchedRow);
                        if (this.checkIsEmptyByColumn(touchedColumn - 1, touchedRow + yMinus)) {
                            itemPos.y = touchPos.y;
                        }
                        break;
                    }
                    case 1: {
                        itemPos = this.getPosByColumn(touchedColumn + 1, touchedRow);
                        if (this.checkIsEmptyByColumn(touchedColumn + 1, touchedRow + yMinus)) {
                            itemPos.y = touchPos.y;
                        }
                        break;
                    }
                    case 2: {
                        itemPos = this.getPosByColumn(touchedColumn, touchedRow + 1);
                        if (this.checkIsEmptyByColumn(touchedColumn + xMinus, touchedRow + 1)) {
                            itemPos.x = touchPos.x;
                        }
                        break;
                    }
                    case 3: {
                        itemPos = this.getPosByColumn(touchedColumn - 1, touchedRow + 1);
                        break;
                    }
                    case 4: {
                        itemPos = this.getPosByColumn(touchedColumn + 1, touchedRow + 1);
                        break;
                    }
                }

                this.movedItem.setPosition(itemPos);
            }
        }
    },

    //触摸结束响应函数
    onTouchEnd: function (event) {
        if (this.movedItem == null) {
            return;
        }

        this.checkDragItemFallPos(this.movedItem);

        this.movedItem = null;
    },

    //根据触摸位置获取触摸元素
    getTouchedItemByPos: function (pos) {
        if (pos.x < 0 || pos.y < 0 ||
            pos.x >= this.itemWidth * this.maxColumn || pos.y >= this.itemHeight * this.maxRow) {
            return null;
        }
        var column = Math.floor(pos.x / this.itemWidth);
        var row = Math.floor(pos.y / this.itemHeight);

        return this.getItemByColumn(column, row);
    },

    //判断触摸节点是否可以移动
    isTouchedItemCanMove: function (item) {
        if (item == null) {
            return false;
        }
        //已经连接，无法移动
        if (item.getComponent("item").getIsLinked()) {
            return false;
        }
        //元素上方有锁，无法移动
        if (item.getComponent("item").getTriggerState() == EnumData.ItemTriggerStateEnum.Lock) {
            return false;
        }

        var column = item.getComponent("item").getColumn();
        var row = item.getComponent("item").getRow();

        if (column > 0 && this.checkIsEmptyByColumn(column - 1, row)) {
            return true;
        }
        if (column < this.maxColumn - 1 && this.checkIsEmptyByColumn(column + 1, row)) {
            return true;
        }
        if (row < this.maxRow - 1 && this.checkIsEmptyByColumn(column, row + 1)) {
            return true;
        }

        return false;
    },

    //根据行列获得坐标
    getPosByColumn: function (column, row) {
        return cc.v2(column * this.itemWidth + this.itemWidth / 2, row * this.itemHeight + this.itemHeight / 2);
    },

    //根据行列获得元素
    getItemByColumn: function (column, row) {
        if (column < 0 || column >= this.maxColumn ||
            row < 0 || row >= this.maxRow) {
            return -1;
        }

        return this.itemArray[row][column];
    },

    //设置某一位置元素
    setItemByColumn: function (column, row, item) {
        if (column < 0 || column >= this.maxColumn ||
            row < 0 || row >= this.maxRow) {
            return;
        }
        if (this.getItemByColumn(column, row) != null && item != null) {
            cc.log("Error:Items_root.setItemByColumn:", column, row, " has item");
            return;
        }

        this.itemArray[row][column] = item;
    },
    //根据行列获得下落元素
    getFallingItemByColumn: function (column, row) {
        if (column < 0 || column >= this.maxColumn ||
            row < 0 || row >= this.maxRow) {
            return -1;
        }

        return this.fallingItemArr[row][column];
    },

    //设置某一位置元素
    setFallingItemByColumn: function (column, row, item) {
        if (column < 0 || column >= this.maxColumn ||
            row < 0 || row >= this.maxRow) {
            return;
        }
        if (this.getFallingItemByColumn(column, row) != null && item != null) {
            cc.log("Error:Items_root.setFallingItemByColumn:", column, row, " has item");
            return;
        }

        this.fallingItemArr[row][column] = item;
    },

    //检查某位置是否为空，包括普通元素和正在下落元素
    checkIsEmptyByColumn: function (column, row) {
        if (column < 0 || column >= this.maxColumn ||
            row < 0 || row >= this.maxRow) {
            return false;
        }

        //cc.log("column:", column, ",row:",row);

        if (this.getItemByColumn(column, row) != null) {
            return false;
        }
        if (this.getFallingItemByColumn(column, row) != null) {
            return false;
        }

        return true;
    },

    //拖动元素下落检测
    checkDragItemFallPos: function (draggedItem) {
        if (draggedItem == null) {
            return;
        }
        var pos = draggedItem.getPosition();
        var column = Math.floor(pos.x / this.itemWidth);
        var row = Math.floor(pos.y / this.itemHeight);

        //检测可以下落位置
        var fallRow = row;
        for (; fallRow > 0; --fallRow) {
            if (!this.checkIsEmptyByColumn(column, fallRow - 1)) {
                break;
            }
        }

        this.fallingItemArr[fallRow][column] = draggedItem;
        draggedItem.getComponent("item").setPos(column, fallRow);
        var time = (pos.y - this.getPosByColumn(column, fallRow).y) / this.itemHeight * this.itemFallTime;
        draggedItem.x = (this.getPosByColumn(column, fallRow).x);
        //下落动画
        draggedItem.runAction(cc.sequence(cc.moveTo(time, this.getPosByColumn(column, fallRow)),
            cc.callFunc(this.fallingItemToGrand, this, [column, fallRow])));
    },

    //普通元素下落检测
    checkNormalItemFallPos: function (normalItem) {
        if (normalItem == null) {
            return false;
        }
        var pos = normalItem.getPosition();
        var column = Math.floor(pos.x / this.itemWidth);
        var row = Math.floor(pos.y / this.itemHeight);
        if (row > this.maxRow - 1) {
            if (!this.checkIsEmptyByColumn(column, this.maxRow - 1)) {
                return false;
            }
        }

        //检测可以下落位置
        var fallRow = Math.min(row, this.maxRow);
        for (; fallRow > 0; --fallRow) {
            if (!this.checkIsEmptyByColumn(column, fallRow - 1)) {
                break;
            }
        }
        if (fallRow == row) {
            return false;
        }

        this.fallingItemArr[fallRow][column] = normalItem;
        this.setItemByColumn(column, row, null);
        normalItem.getComponent("item").setPos(column, fallRow);
        var time = (pos.y - this.getPosByColumn(column, fallRow).y) / this.itemHeight * this.itemFallTime;
        normalItem.x = (this.getPosByColumn(column, fallRow).x);
        //下落动画
        normalItem.runAction(cc.sequence(cc.moveTo(time, this.getPosByColumn(column, fallRow)),
            cc.callFunc(this.fallingItemToGrand, this, [column, fallRow])));

        //检查上方元素下落
        this.checkFallItemsByColumn(column, row);

        return true;
    },

    //元素消失位置下落元素检查
    checkFallItemsByColumn(column, row) {
        for (var i = row + 1; i < this.maxRow; ++i) {
            if (this.getItemByColumn(column, i) != null &&
                !this.getItemByColumn(column, i).getComponent("item").getIsLinked()) {
                this.checkNormalItemFallPos(this.getItemByColumn(column, i));
            }
        }
    },

    //下落区元素生效
    fallingItemToGrand: function (taget, data) {
        cc.log("item_root, fallingItemToGrand:", data);
        var column = data[0];
        var row = data[1];
        var toGrandItem = this.fallingItemArr[row][column];
        if (toGrandItem == null) {
            return;
        }
        //清空下落区原来元素
        this.fallingItemArr[row][column] = null;

        if (this.getItemByColumn(column, row) != null) {
            return;
        }
        this.setItemByColumn(column, row, toGrandItem);
        //("item_root:fallingItemToGrand:data:",data);

        if (!this.checkNormalItemFallPos(toGrandItem)) {
            //检查链接元素
            if (!this.checkLinkItemsByNewItem(toGrandItem)) {
                //元素播放落地谈起动画
                if (data.length < 3 || data[2] == 1) {
                    toGrandItem.runAction(cc.sequence(cc.scaleTo(0.07, 1.3, 0.8),
                        cc.scaleTo(0.1, 0.9, 1.1),
                        cc.scaleTo(0.03, 1, 1)));
                }

                //检查是否需要底部生成新元素
                var self = this;
                this.node.runAction(cc.sequence(cc.delayTime(0.2),
                    cc.callFunc(function () {
                        self.checkIfCreateLineInBottom();
                    })));
            }
        }
    },

    //检查和新元素连接的元素和已检测连接组
    checkLinkItemsByNewItem(newItem) {
        //已连接元素组检测
        var linkedItemsArrsIndex = new Array;
        for (var i = 0; i < this.linkedInfoArr.length; ++i) {
            var linkedArr = this.linkedInfoArr[i].arr;
            for (var j = 0; j < linkedArr.length; ++j) {
                if (this.checkTwoItemsLinked(linkedArr[j], newItem)) {
                    linkedItemsArrsIndex.push(i);
                    break;
                }
            }
        }

        //普通元素连接检查
        var checkedItemsArr = new Array;
        this.getLinkedArrByItem(newItem, checkedItemsArr);
        if (linkedItemsArrsIndex.length > 0) {
            var newArr = new Array;

            var delNum = 0;
            for (var i = 0; i < linkedItemsArrsIndex.length; ++i) {
                newArr = newArr.concat(this.linkedInfoArr[linkedItemsArrsIndex[i] - delNum].arr);
                this.linkedInfoArr.splice(linkedItemsArrsIndex[i] - delNum, 1);
                ++delNum;
            }

            for (var j = 0; j < checkedItemsArr.length; ++j) {
                newArr = newArr.concat(checkedItemsArr[j]);
            }
            this.addNewLinkedArr(newArr);

            return true;
        }
        else {
            if (checkedItemsArr.length >= this.itemMinLinkNum) {
                this.addNewLinkedArr(checkedItemsArr);
                return true;
            }
        }

        return false;
    },

    //检查两个元素是否相邻
    checkTwoItemsLinked: function (item1, item2) {
        if (item1 == null || item2 == null) {
            return false;
        }

        var columnDif = Math.abs(item1.getComponent("item").getColumn() - item2.getComponent("item").getColumn());
        var rowDif = Math.abs(item1.getComponent("item").getRow() - item2.getComponent("item").getRow());

        if (columnDif + rowDif == 1 && item1.getComponent("item").getItemType() === item2.getComponent("item").getItemType()) {
            return true;
        }
        return false;
    },

    //根据新元素获取连接数组
    getLinkedArrByItem(item, linkedArr) {
        linkedArr.push(item);
        var quareArr = this.getQuareItemsArr(item);
        for (var i = 0; i < quareArr.length; ++i) {
            if (quareArr[i].getComponent("item").getItemType() == item.getComponent("item").getItemType() &&
                !this.checkItemInArr(quareArr[i], linkedArr) &&
                !quareArr[i].getComponent("item").getIsLinked()) {
                this.getLinkedArrByItem(quareArr[i], linkedArr);
            }
        }
    },

    //获得所有的元素列表
    getAllItemsList: function () {
        var itemList = new Array;
        for (var column = 0; column < this.maxColumn; ++column) {
            for (var row = 0; row < this.maxRow; ++row) {
                var item = this.getItemByColumn(column, row);
                if (item != null && item != -1) {
                    itemList.push(item);
                }
            }
        }
        return itemList;
    },

    //获取元素四周的元素列表
    getQuareItemsArr: function (item) {
        cc.log("item_root:getQuareItemsArr, item:", item);
        var itemsArr = new Array;

        var column = item.getComponent("item").getColumn();
        var row = item.getComponent("item").getRow();
        if (this.getItemByColumn(column - 1, row) != null && this.getItemByColumn(column - 1, row) != -1) {
            itemsArr.push(this.getItemByColumn(column - 1, row));
        }
        if (this.getItemByColumn(column + 1, row) != null && this.getItemByColumn(column + 1, row) != -1) {
            itemsArr.push(this.getItemByColumn(column + 1, row));
        }
        if (this.getItemByColumn(column, row - 1) != null && this.getItemByColumn(column, row - 1) != -1) {
            itemsArr.push(this.getItemByColumn(column, row - 1));
        }
        if (this.getItemByColumn(column, row + 1) != null && this.getItemByColumn(column, row + 1) != -1) {
            itemsArr.push(this.getItemByColumn(column, row + 1));
        }

        return itemsArr;
    },

    //检测元素是否在数组中
    checkItemInArr(item, itemsArr) {
        for (var i = 0; i < itemsArr.length; ++i) {
            if (item === itemsArr[i]) {
                return true;
            }
        }
        return false;
    },

    //添加新的连接数组
    addNewLinkedArr: function (linkedArr) {
        var newLinkedInfo = {
            time: 0,
            arr: linkedArr,
        };

        //每个元素执行颤抖动画
        for (var i = 0; i < linkedArr.length; ++i) {
            linkedArr[i].getComponent("item").setIsLinked(true);
            linkedArr[i].stopAllActions();
            linkedArr[i].setScale(1);
            linkedArr[i].runAction(cc.shake(1.1, 3, 3));
        }

        this.linkedInfoArr.push(newLinkedInfo);
    },

    //从底部生成元素上升
    createNewLineInBottom: function (lineNum) {
        for (var i = 0; i < this.maxColumn; ++i) {
            for (var line = 0; line < lineNum; ++line) {
                var newItem = cc.instantiate(this.itemPrefab);
                newItem.getComponent("item").setItemType(this.getNewItemType());
                //newItem.getComponent("item").setTriggerState(Math.random() < this.currentLevelConfig.lockProbability ? EnumData.ItemTriggerStateEnum.Lock : EnumData.ItemTriggerStateEnum.Normal);
                newItem.getComponent("item").setTriggerState(EnumData.ItemTriggerStateEnum.Normal);

                newItem.parent = this.node;

                newItem.getComponent("item").setPos(i, line);
                newItem.setPosition(cc.v2(i * this.itemWidth + this.itemWidth / 2,
                    - this.itemHeight / 2));
                this.setFallingItemByColumn(i, line, newItem);

                newItem.runAction(cc.sequence(cc.delayTime(this.itemRiseTime * (lineNum - line - 1)),
                    cc.moveBy(this.itemRiseTime * (line + 1), cc.v2(0, this.itemHeight * (line + 1))),
                    cc.callFunc(this.fallingItemToGrand, this, [i, line, 0])));
            }
        }

        for (var row = 0; row < this.maxRow; ++row) {
            for (var column = 0; column < this.maxColumn; ++column) {
                var item = this.getItemByColumn(column, row);
                if (item != null) {
                    item.getComponent("item").setPos(column, row + lineNum);
                    this.setFallingItemByColumn(column, row + lineNum, item);
                    this.setItemByColumn(column, row, null);

                    item.runAction(cc.sequence(cc.moveBy(this.itemRiseTime * lineNum, cc.v2(0, this.itemHeight * lineNum)),
                        cc.callFunc(this.fallingItemToGrand, this, [column, row + lineNum, 0])));
                }
            }
        }
    },

    //检查是否需要底部生成新元素
    checkIfCreateLineInBottom: function () {
        //条件：无下落元素，无连接元素，无拖动元素，元素个数小于21
        if (this.linkedInfoArr.length > 0 || this.movedItem != null) {
            return false;
        }

        var itemNum = 0;
        var fallingItemNum = 0;
        var maxRow = 0;
        for (var row = 0; row < this.maxRow; ++row) {
            for (var column = 0; column < this.maxColumn; ++column) {
                if (this.getItemByColumn(column, row) != null) {
                    ++itemNum;
                    maxRow = row;
                }
                if (this.getFallingItemByColumn(column, row) != null) {
                    ++fallingItemNum;
                    maxRow = row;
                }
            }
        }

        if (fallingItemNum > 0) {
            return false;
        }

        if (maxRow >= this.maxRow - 1) {
            return false;
        }

        if (itemNum < 3 * this.maxColumn) {
            this.createNewLineInBottom(Math.min(Math.ceil(3 - itemNum / this.maxColumn), this.maxRow - maxRow - 1));

            return true;
        }
        return false;
    },

    //在上方生成新元素，倒计时下落
    createNewLineOnTop: function () {
        this.topNewLineArr.length = 0;
        this.topLineDropWaitingTime = 0;
        for (var i = 0; i < this.maxColumn; ++i) {
            var newItem = cc.instantiate(this.itemPrefab);
            newItem.getComponent("item").setItemType(this.getNewItemType());
            newItem.getComponent("item").setTriggerState(Math.random() < this.currentLevelConfig.lockProbability ? EnumData.ItemTriggerStateEnum.Lock : EnumData.ItemTriggerStateEnum.Normal);
            newItem.getComponent("item").setTriggerState(EnumData.ItemTriggerStateEnum.Normal);

            newItem.parent = this.node;

            newItem.getComponent("item").setPos(i, this.maxRow);
            newItem.setPosition(cc.v2(i * this.itemWidth + this.itemWidth / 2, this.topLineCreateHeight));

            newItem.runAction(cc.moveBy(this.itemFallTime / 2, cc.v2(0, -this.itemHeight / 2)));

            this.topNewLineArr.push(newItem);
        }
    },

    //上方新元素行震动提醒
    topNewLineShake: function () {
        for (var i = 0; i < this.topNewLineArr.length; ++i) {
            var item = this.topNewLineArr[i];
            item.runAction(cc.repeatForever(cc.sequence(cc.moveBy(0.025, cc.v2(-2, 0)),
                cc.moveBy(0.05, cc.v2(4, 0)),
                cc.moveBy(0.025, cc.v2(-2, 0)))));
        }
    },

    //上方新元素下落
    topNewLineFall: function () {
        this.topLineDropWaitingTime = 0;
        for (var i = 0; i < this.topNewLineArr.length; ++i) {
            var item = this.topNewLineArr[i];
            item.stopAllActions();
            if (!this.checkNormalItemFallPos(item)) {
                item.destroy();
            }
        }

        this.topNewLineArr.length = 0;
        this.scheduleOnce(this.createNewLineOnTop, 0.5);
    },

    //加载关卡配置json文件
    loadLevelConfigJson: function () {
        var urls = 'Json/levelConfig', _type = cc.RawAsset;

        var self = this;
        cc.loader.loadRes(urls, _type, function (err, res) {
            self.levelConfig = res.json;
            self.onConfigDataRead();
        })
    },

    //读取游戏配置json文件
    readGameConfigJson: function () {
        var urls = 'Json/gameConfig', _type = cc.RawAsset;
        var self = this;
        cc.loader.loadRes(urls, _type, function (err, res) {
            self.gameConfig = res.json;
        })
    },

    //获得新元素随机类型
    getNewItemType: function () {
        var totalPercentage = 0;
        for (var i = 0; i < this.currentLevelConfig.itemsData.length; ++i) {
            totalPercentage += this.currentLevelConfig.itemsData[i][1];
        }
        var randomPercentage = Math.random() * totalPercentage;

        var currentPercentage = 0;
        for (var i = 0; i < this.currentLevelConfig.itemsData.length; ++i) {
            currentPercentage += this.currentLevelConfig.itemsData[i][1];
            if (currentPercentage >= randomPercentage) {
                return this.currentLevelConfig.itemsData[i][0];
            }
        }

        return this.currentLevelConfig.itemsData[0][0];
    },

    //连接元素列表触发
    triggerLinkedItemList: function (itemList) {
        //创建类型
        var createType = EnumData.ItemTriggerStateEnum.Normal;
        var itemNum = itemList.length;
        if (itemNum >= linkCreateNum.BlackHole) {
            createType = EnumData.ItemTriggerStateEnum.BlackHole;
        }
        else if (itemNum >= linkCreateNum.Lightning) {
            createType = EnumData.ItemTriggerStateEnum.Lightning;
        }
        else if (itemNum >= linkCreateNum.FireBird) {
            createType = EnumData.ItemTriggerStateEnum.FireBird;
        }
        else if (itemNum >= linkCreateNum.Bomb) {
            createType = EnumData.ItemTriggerStateEnum.Bomb;
        }
        var changeItem = null;
        if (createType != EnumData.ItemTriggerStateEnum.Normal) {
            //转换元素
            changeItem = itemList[itemList.length - 1];
            for (var i = 0; i < itemList.length; ++i) {
                if (itemList[i].getComponent("item").getTriggerState() == EnumData.ItemTriggerStateEnum.Lock) {
                    changeItem = itemList[i];
                    break;
                }
            }
        }

        var lockList = new Array;
        var normalList = new Array;
        var bombList = new Array;
        //移动列表
        for (var i = 0; i < itemList.length; ++i) {
            var item = itemList[i];
            var column = item.getComponent("item").getColumn();
            var row = item.getComponent("item").getRow();
            this.setItemByColumn(column, row, null);
            this.setFallingItemByColumn(column, row, item);

            if (item.getComponent("item").getTriggerState() == EnumData.ItemTriggerStateEnum.Normal) {
                if (item != changeItem) {
                    normalList.push(item);
                }
            }

            //锁元素锁去掉
            if (item.getComponent("item").getTriggerState() == EnumData.ItemTriggerStateEnum.Lock) {
                item.getComponent("item").setTriggerState(EnumData.ItemTriggerStateEnum.Normal);
                this.playLockBreakAnim(item.getPosition());
                lockList.push(item);
            }

            if (item.getComponent("item").getTriggerState() > EnumData.ItemTriggerStateEnum.Normal) {
                item.visible = false;
                if (item != changeItem) {
                    bombList.push(item);
                }

                //this.triggerPropItem(item);
            }
        }

        //道具元素触发
        for (var i = 0; i < bombList.length; ++i) {
            this.delayTriggerPropNum(bombList[i]);
        }
        if (changeItem != null && changeItem.getComponent("item").getTriggerState() > EnumData.ItemTriggerStateEnum.Normal) {
            this.delayTriggerPropNum(changeItem);
        }

        //转换新元素延迟设置
        if (createType != EnumData.ItemTriggerStateEnum.Normal) {

            for (var j = 0; j < normalList.length; ++j) {
                var moveItem = normalList[j];
                moveItem.runAction(cc.moveTo(this.itemElimateTime, changeItem.getPosition()));
            }

            //生成新元素 
            var newItem = cc.instantiate(this.itemPrefab);
            newItem.getComponent("item").setItemType(changeItem.getComponent("item").getItemType());
            newItem.getComponent("item").setTriggerState(createType);
            newItem.parent = this.node;
            newItem.getComponent("item").setPos(changeItem.getComponent("item").getColumn(), changeItem.getComponent("item").getRow());
            newItem.setPosition(changeItem.getPosition());
            newItem.visible = false;

            this.setFallingItemByColumn(newItem.getComponent("item").getColumn(), newItem.getComponent("item").getRow(), null);
            this.setFallingItemByColumn(newItem.getComponent("item").getColumn(), newItem.getComponent("item").getRow(), newItem);

            var self = this;
            newItem.runAction(cc.sequence(cc.delayTime(this.itemElimateTime), cc.callFunc(function () {

                //锁元素落地
                for (var k = 0; k < lockList.length; ++k) {
                    var column = lockList[k].getComponent("item").getColumn();
                    var row = lockList[k].getComponent("item").getRow();
                    if (lockList[k] == changeItem) {
                        //self.elimateFallingItemList([lockList[k]]);
                    }
                    else {
                        lockList[k].getComponent("item").setIsLinked(false);
                        self.fallingItemToGrand(self, [column, row]);
                    }
                }

                self.showCompositeItemsScore(itemList.length, changeItem.getComponent("item").getItemType(), changeItem.getPosition());

                self.elimateFallingItemList(normalList);
                self.elimateFallingItemList(bombList);
                changeItem.destroy();

                newItem.visible = true;
                self.fallingItemToGrand(self, [newItem.getComponent("item").getColumn(), newItem.getComponent("item").getRow()]);
            })));
        }
        else {
            for (var i = 0; i < normalList.length; ++i) {
                normalList[i].visible = false;
            }

            var self = this;
            this.node.runAction(cc.sequence(cc.delayTime(this.itemElimateTime),
                cc.callFunc(function () {

                    self.showCompositeItemsScore(itemList.length, itemList[itemList.length - 1].getComponent("item").getItemType(), itemList[itemList.length - 1].getPosition());
                    self.elimateFallingItemList(normalList);
                    self.elimateFallingItemList(bombList);
                    for (var j = 0; j < lockList.length; ++j) {
                        lockList[j].getComponent("item").setIsLinked(false);
                        self.fallingItemToGrand(self, [lockList[j].getComponent("item").getColumn(), lockList[j].getComponent("item").getRow()]);
                    }
                })));
        }
    },

    //消除放入下落队列的元素列表
    elimateFallingItemList(itemList) {
        for (var i = 0; i < itemList.length; ++i) {
            var item = itemList[i];

            // FIXME item would be undefined sometimes when play blackhole effect
            if (!item) {
                return;
            }

            var column = item.getComponent("item").getColumn();
            var row = item.getComponent("item").getRow();
            item.destroy();

            this.setFallingItemByColumn(column, row, null);
            this.checkFallItemsByColumn(column, row);
        }

        //检查是否需要底部生成新元素
        var self = this;
        this.node.runAction(cc.sequence(cc.delayTime(0.2),
            cc.callFunc(function () {
                self.checkIfCreateLineInBottom();
            })));
    },

    //延迟触发道具
    delayTriggerPropNum: function (item) {
        var self = this;
        this.node.runAction(cc.sequence(cc.delayTime(this.itemElimateTime / 2),
            cc.callFunc(function () {
                self.triggerPropItem(item);
            })));
    },

    //道具元素触发
    triggerPropItem: function (item) {
        if (item == null && item.parent == null) {
            return;
        }
        var itemComp = item.getComponent("item");
        var propType = itemComp.getTriggerState();
        if (propType <= EnumData.ItemTriggerStateEnum.Normal) {
            return;
        }
        var column = itemComp.getColumn();
        var row = itemComp.getRow();
        var triggerList = new Array;

        var self = this;

        switch (propType) {
            case EnumData.ItemTriggerStateEnum.Bomb: {
                //获取3*3范围内元素
                for (var i = column - 1; i <= column + 1; ++i) {
                    for (var j = row - 1; j <= row + 1; ++j) {
                        var triggerItem = this.getItemByColumn(i, j);
                        if (triggerItem != null && triggerItem != -1 && triggerItem != item && !triggerItem.getComponent("item").getIsLinked()) {
                            triggerList.push(triggerItem);
                        }
                    }
                }

                this.elimateItemList(triggerList, EnumData.ItemTriggerStateEnum.Bomb);
                break;
            }
            case EnumData.ItemTriggerStateEnum.FireBird: {

                //火鸟触发动画
                var fireBirdEffct = cc.instantiate(this.fireBirdEffctAnim);
                fireBirdEffct.parent = this.itemEffectNode;
                fireBirdEffct.setPosition(this.getPosByColumn(column, row));
                fireBirdEffct.runAction(cc.sequence(cc.moveTo(this.itemFallTime * 4 * (row), this.getPosByColumn(column, 0)),
                    cc.delayTime(0.2),
                    cc.removeSelf()));

                for (var currRow = row, newRow = row; currRow >= 0; --currRow) {
                    fireBirdEffct.runAction(cc.sequence(cc.delayTime((row - currRow) * self.itemFallTime * 4),
                        cc.callFunc(function () {
                            var item = self.getItemByColumn(column, newRow);
                            if (item != null && !item.getComponent("item").getIsLinked()) {
                                triggerList.push(item);
                                self.setItemByColumn(column, newRow, null);
                                self.setFallingItemByColumn(column, newRow, item);
                                item.getComponent("item").turnFireBirdBlack();
                            }

                            if (newRow == 0) {
                                //下降到最下面，把左右两边两行三列也加上
                                for (var j = column - 1; j <= column + 1; ++j) {
                                    for (var k = 0; k <= 1; ++k) {
                                        var item = self.getItemByColumn(j, k);
                                        if (item != null && item != -1 && !item.getComponent("item").getIsLinked()) {
                                            if (!self.checkItemInArr(item, triggerList)) {
                                                triggerList.push(item);
                                                self.setItemByColumn(j, k, null);
                                                self.setFallingItemByColumn(j, k, item);
                                                item.getComponent("item").turnFireBirdBlack();
                                            }
                                        }
                                    }
                                }
                            }
                            --newRow;
                        })));
                }

                //消除元素触发
                this.node.runAction(cc.sequence(cc.delayTime(row * self.itemFallTime * 4 + 0.1), cc.callFunc(function () {
                    //消除元素震动
                    for (var i = 0; i < triggerList.length; ++i) {
                        triggerList[i].runAction(cc.shake(0.6, 3, 3));
                    }
                }), cc.delayTime(0.5), cc.callFunc(function () {
                    self.elimateItemList(triggerList, EnumData.ItemTriggerStateEnum.FireBird);
                })));

                break;
            }
            case EnumData.ItemTriggerStateEnum.Lightning: {

                //获取触发元素列表
                for (var i = 0; i < this.maxColumn; ++i) {
                    var item = this.getItemByColumn(i, row);
                    if (item != null && item != -1 && !item.getComponent("item").getIsLinked()) {
                        triggerList.push(item);
                    }
                }
                for (var j = 0; j < this.maxRow; ++j) {
                    var item = this.getItemByColumn(column, j);
                    if (item != null && item != -1 && !item.getComponent("item").getIsLinked()) {
                        triggerList.push(item);
                    }
                }

                //闪电闪烁动画
                var lightningNode = cc.instantiate(this.lightningEffectNode);
                lightningNode.parent = this.itemEffectNode;
                var columnSprite = lightningNode.getChildByName("column");
                var rowSprite = lightningNode.getChildByName("row");

                columnSprite.y = (this.getPosByColumn(column, row).y);
                rowSprite.x = (this.getPosByColumn(column, row).x);

                columnSprite.runAction(cc.sequence(cc.delayTime(0.1),
                    cc.fadeTo(0, 0), cc.fadeTo(0.1, 255),
                    cc.scaleTo(0.2, 1, 0.8), cc.scaleTo(0.2, 1, 1),
                    cc.scaleTo(0.2, 1, 0.8), cc.scaleTo(0.2, 1, 1),
                    cc.scaleTo(0.4, 1, 0)));
                rowSprite.runAction(cc.sequence(cc.delayTime(0.1),
                    cc.fadeTo(0, 0), cc.fadeTo(0.1, 255),
                    cc.scaleTo(0.2, 0.8, 1), cc.scaleTo(0.2, 1, 1),
                    cc.scaleTo(0.2, 0.8, 1), cc.scaleTo(0.2, 1, 1),
                    cc.scaleTo(0.4, 0, 1)));

                lightningNode.runAction(cc.sequence(cc.delayTime(1.3),
                    cc.removeSelf()));

                //消除节点骷髅闪烁动画
                for (var i = 0; i < triggerList.length; ++i) {
                    var item = triggerList[i];
                    var itemCol = item.getComponent("item").getColumn();
                    var itemRow = item.getComponent("item").getRow();
                    this.setItemByColumn(itemCol, itemRow, null);
                    this.setFallingItemByColumn(itemCol, itemRow, item);

                    var skullSprite = cc.instantiate(this.skullSprite);
                    skullSprite.parent = this.itemEffectNode;
                    skullSprite.setPosition(item.getPosition());
                    skullSprite.runAction(cc.sequence(cc.delayTime(0.1),
                        cc.fadeTo(0, 0), cc.fadeTo(0.1, 255),
                        cc.fadeTo(0.1, 128), cc.fadeTo(0.1, 255), cc.fadeTo(0.1, 0), cc.fadeTo(0.1, 255),
                        cc.fadeTo(0.1, 128), cc.fadeTo(0.1, 255), cc.fadeTo(0.1, 0), cc.fadeTo(0.1, 255),
                        cc.delayTime(0.1), cc.removeSelf()));
                }

                this.node.runAction(cc.sequence(cc.delayTime(1.2), cc.callFunc(function () {
                    self.elimateItemList(triggerList, EnumData.ItemTriggerStateEnum.Lightning);
                })));

                break;
            }
            case EnumData.ItemTriggerStateEnum.BlackHole: {
                //黑色蒙层
                var colorSprite = this.itemEffectNode.getChildByName("colorSprite");
                colorSprite.runAction(cc.sequence(cc.fadeTo(0.2, 150),
                    cc.delayTime(2.6), cc.fadeTo(0.2, 0)));

                //黑洞特效
                var blackHoleEffAnim = cc.instantiate(this.blackHoleTriggerEffectAnim);
                blackHoleEffAnim.parent = this.itemEffectNode;
                blackHoleEffAnim.setPosition(item.getPosition());
                blackHoleEffAnim.runAction(cc.sequence(cc.delayTime(2.8),
                    cc.scaleTo(0.2, 0),
                    cc.removeSelf()));

                //元素飞行
                var allItemList = this.getAllItemsList();
                var elimateItemList = new Array;
                //将黑洞检查剔除
                for (var i = 0; i < allItemList.length; ++i) {
                    if (allItemList[i].getComponent("item").getTriggerState() == EnumData.ItemTriggerStateEnum.BlackHole) {
                        allItemList.splice(i, 1);
                        --i;
                    }
                }

                var elimateNum = Math.min(allItemList.length, this.blackHoleElimateNum);
                //随机选择元素消除
                while (elimateItemList.length < elimateNum) {
                    var randomIndex = Math.floor(allItemList.length * Math.random());
                    if (!this.checkItemInArr(allItemList[randomIndex], elimateItemList)) {
                        elimateItemList.push(allItemList[randomIndex]);
                    }
                }

                //消除元素
                for (var index = 0, elimateIndex = 0; index < elimateItemList.length; ++index) {
                    var elimateItem = elimateItemList[index];
                    var elimateColumn = elimateItem.getComponent("item").getColumn();
                    var elimateRow = elimateItem.getComponent("item").getRow();
                    this.setItemByColumn(elimateColumn, elimateRow, null);
                    this.setFallingItemByColumn(elimateColumn, elimateRow, elimateItem);

                    this.node.runAction(cc.sequence(cc.delayTime(2.0 * index / elimateItemList.length),
                        cc.callFunc(function () {
                            var elimateItem = elimateItemList[elimateIndex];
                            ++elimateIndex;

                            // FIXME elimateItem would be undefined sometimes when play blackhole effect
                            if (!elimateItem) {
                                return;
                            }

                            if (elimateItem.getComponent("item").getTriggerState() == EnumData.ItemTriggerStateEnum.Lock) {
                                elimateItem.getComponent("item").setTriggerState(EnumData.ItemTriggerStateEnum.Normal);
                                self.playLockBreakAnim(elimateItem.getPosition());
                            }

                            //普通元素飞行动画
                            if (elimateItem.getComponent("item").getTriggerState() == EnumData.ItemTriggerStateEnum.Normal) {
                                elimateItem.parent = self.itemEffectNode;
                                elimateItem.opacity = 0;

                                var blackHolePos = self.getPosByColumn(column, row);
                                var distance = blackHolePos.sub(elimateItem.getPosition()).mag();
                                var radius = blackHolePos.angle(elimateItem.getPosition()) * 180 / Math.PI - 60;
                                var centerPos = cc.v2(distance * Math.sin(radius), distance * Math.cos(radius)).add(elimateItem.getPosition());

                                elimateItem.runAction(cc.sequence(cc.spawn(cc.fadeTo(0.3, 255), cc.scaleTo(0.3, 1.3)),
                                    cc.spawn(cc.repeatForever(cc.rotateBy(1.0, 360)),
                                        //cc.circleMoveAction(0.5, centerPos, 0, -60),
                                        cc.moveTo(0.5, blackHolePos),
                                        cc.scaleTo(0.5, 0.5))));
                            }
                            else {
                                elimateItem.visible = false;
                                self.delayTriggerPropNum(elimateItem);
                            }

                            self.showElimateItemScore(elimateItem.getComponent("item").getItemType(), EnumData.ItemTriggerStateEnum.BlackHole, elimateItem.getPosition());
                        })));
                }

                this.node.runAction(cc.sequence(cc.delayTime(2.8), cc.callFunc(function () {
                    self.elimateFallingItemList(elimateItemList);
                })))
                break;
            }
        }
    },

    //消除道具列表
    elimateItemList: function (itemList, triggerType) {
        //先放到下落队列
        for (var i = 0; i < itemList.length; ++i) {
            var item = itemList[i];
            var itemComp = item.getComponent("item");
            var column = itemComp.getColumn();
            var row = itemComp.getRow();
            this.setItemByColumn(column, row, null);
            this.setFallingItemByColumn(column, row, item);
            item.visible = false;
        }
        for (var i = 0; i < itemList.length; ++i) {
            var item = itemList[i];
            var itemComp = item.getComponent("item");
            var column = itemComp.getColumn();
            var row = itemComp.getRow();

            //锁破碎动画
            if (itemComp.getTriggerState() == EnumData.ItemTriggerStateEnum.Lock) {
                itemComp.setTriggerState(EnumData.ItemTriggerStateEnum.Normal);

                itemComp.setIsLinked(false);
                this.playLockBreakAnim(this.getPosByColumn(column, row));
            }
            //触发炸弹
            if (item.getComponent("item").getTriggerState() > EnumData.ItemTriggerStateEnum.Normal) {
                this.delayTriggerPropNum(item);
            }
        }

        //延迟设置位置为空
        var self = this;
        this.node.runAction(cc.sequence(cc.delayTime(this.itemElimateTime),
            cc.callFunc(function () {
                for (var index = 0; index < itemList.length; ++index) {
                    self.showElimateItemScore(itemList[index].getComponent("item").getItemType(), triggerType, itemList[index].getPosition());
                }
                self.elimateFallingItemList(itemList);
            })));
    },

    //在某位置播放锁破碎动画
    playLockBreakAnim(pos) {
        var lockEffectNode = cc.instantiate(this.lockBreakAnim);
        lockEffectNode.parent = this.itemEffectNode;
        lockEffectNode.setPosition(pos);
        lockEffectNode.getComponent(cc.Animation).play();

        lockEffectNode.runAction(cc.sequence(cc.delayTime(1.0), cc.removeSelf()))
    },

    ////////////////////////////分数相关
    //获取元素合成分数
    //计算公式：基础分数*（合成的个数-2）*合成技能附加分*鸟类品种附加分*关卡附加分						
    showCompositeItemsScore: function (itemsNum, itemType, pos) {
        var score = this.gameConfig.compositeBisicScore * (itemsNum - 2) *
            this.gameConfig.compositeNumScoreFator[(itemsNum > this.gameConfig.compositeNumScoreFator.length ? this.gameConfig.compositeNumScoreFator.length : itemsNum) - 1] *
            this.gameConfig.birdTypeScoreFator[itemType] *
            this.currentLevelConfig.levelScoreFator;

        var scoreLabel = cc.instantiate(this.scoreLabel);
        scoreLabel.parent = this.itemEffectNode;
        scoreLabel.setPosition(pos);
        scoreLabel.opacity = 0;
        scoreLabel.getComponent(cc.Label).string = score;
        if (itemsNum >= 5) {
            scoreLabel.setScale(1.2);
            scoreLabel.color = cc.color(252, 169, 245);
        }

        scoreLabel.runAction(cc.sequence(cc.spawn(cc.moveBy(0.5, cc.v2(0, this.itemHeight)).easing(cc.easeOut(3)), cc.fadeTo(0.5, 255)),
            cc.delayTime(0.3),
            cc.spawn(cc.moveBy(0.5, cc.v2(0, this.itemHeight)), cc.fadeTo(0.5, 0)).easing(cc.easeIn(5)),
            cc.removeSelf()));

        this.score += score;
        this.totalScoreLabel.getComponent(cc.Label).string = this.score;
    },

    //获取元素消除分数
    //计算公式：非合成的单个消除基础分数*鸟类品种附加分*爆破技能分*关卡附加分						
    showElimateItemScore(itemType, itemTriggerState, pos) {
        var score = this.gameConfig.elimateBasicScore *
            this.gameConfig.birdTypeScoreFator[itemType] *
            this.gameConfig.elimatePropScoreFator[itemTriggerState] *
            this.currentLevelConfig.levelScoreFator;

        var scoreLabel = cc.instantiate(this.scoreLabel);
        scoreLabel.parent = this.itemEffectNode;
        scoreLabel.setPosition(pos);
        scoreLabel.opacity = 0;
        scoreLabel.getComponent(cc.Label).string = score;

        scoreLabel.runAction(cc.sequence(cc.spawn(cc.moveBy(0.3, cc.v2(0, this.itemHeight)).easing(cc.easeOut(2)), cc.fadeTo(0.3, 255)),
            cc.delayTime(0.5),
            cc.spawn(cc.moveBy(0.3, cc.v2(0, this.itemHeight)), cc.fadeTo(0.3, 0)).easing(cc.easeIn(2)),
            cc.removeSelf()));

        this.score += score;
        this.totalScoreLabel.getComponent(cc.Label).string = this.score;
    }
});
