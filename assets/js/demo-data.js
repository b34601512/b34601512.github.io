/* 首页演示的话术数据与话术行标记：浏览器与构建脚本共用同一份，避免两处各写一遍。
   浏览器：本文件在 demo.js 之前加载，挂到 window.SOFTTALK_DEMO。
   构建：src/site/pages/index.mjs 在 Node 里 import 同一份，把默认那一套话术预先写进
   index.html —— 爬虫不执行 JS，首页才有可索引的正文；页面加载后 demo.js 接管渲染，
   用的是同一个 treeHtml()，所以静态 HTML 与运行时渲染逐字一致，不会闪也不会重复。 */
/* 话术类型角标取自客户端 platform_images（见 scripts/optimize-images.py）。 */
const TYPE_ICONS = {
  text: "assets/type-text.png",
  image: "assets/type-image.png",
  pdf: "assets/type-pdf.png",
};

/* ---------- 演示数据：3 个话术域 × 0–9 十套话术，共 30 套（和客户端一致） ----------
   一级分类配色只用客户端色板 lv1_color_presets.py 里的浅色预设，不自己造色。 */
const SCOPES = {
  team: {
    label: "团队话术",
    sets: [
      {
        name: "默认话术",
        categories: [
          {
            label: "售前",
            color: "#DDEFFB",
            sections: [
              {
                title: "欢迎话术",
                open: true,
                items: [
                  { title: "欢迎问候", text: "亲，您好！欢迎光临，有什么可以帮到您的吗？", tag: "text" },
                  { title: "忙时提醒", text: "您好，稍等一下哦，马上为您服务~", tag: "text" },
                ],
              },
              {
                title: "产品咨询",
                items: [
                  { title: "正品承诺", text: "我们家的产品都是正品保障，假一赔十，请放心~", tag: "image" },
                  { title: "质量说明", text: "所有产品经过严格质检才会发货，品质有保障哦~" },
                ],
              },
              {
                title: "价格问题",
                items: [
                  { title: "议价回复", text: "亲，已经是全网最优惠的价格啦，品质一流~" },
                  { title: "优惠活动", text: "现在参加满减活动，优惠力度很大，下单稳赚~", tag: "image" },
                ],
              },
            ],
          },
          {
            label: "催付",
            color: "#FFF1D6",
            sections: [
              {
                title: "订单跟进",
                open: true,
                items: [
                  { title: "拍后未付", text: "亲，您有一笔订单还未付款哦，现货有限，建议尽快付款~" },
                  { title: "活动截止", text: "亲，活动即将结束，现在付款还能享受优惠价，不要错过哦~" },
                ],
              },
              {
                title: "付款提醒",
                items: [{ title: "付款致谢", text: "已收到您的付款，我们会尽快为您安排发货，感谢信任~" }],
              },
            ],
          },
          {
            label: "售后",
            color: "#DDF7EA",
            sections: [
              {
                title: "问题处理",
                open: true,
                items: [
                  { title: "道歉先行", text: "非常抱歉给您带来了不好的体验！我马上帮您解决！" },
                  { title: "核实情况", text: "麻烦您把问题照片发过来，我帮您确认一下~", tag: "image" },
                ],
              },
              {
                title: "退款退货",
                items: [
                  { title: "申请退款", text: "已为您申请退款，预计 1-3 个工作日到账~" },
                  { title: "退货说明", text: "请将商品原包装完好地寄回，运费由我们承担~", tag: "pdf" },
                ],
              },
            ],
          },
          {
            label: "发货",
            color: "#E6E9FF",
            sections: [
              {
                title: "发货时效",
                open: true,
                items: [
                  { title: "常规发货", text: "付款后 48 小时内安排发货，节假日顺延 1-2 天哦~" },
                  { title: "急单处理", text: "有急用可在订单备注写「急」，我们会优先安排发货~" },
                ],
              },
              {
                title: "快递查询",
                items: [
                  { title: "查快递", text: "快递信息在订单详情页可查，也可把单号发我帮您查~" },
                  { title: "丢件处理", text: "如快递超时未到，请联系我，我马上帮您跟进~" },
                ],
              },
            ],
          },
          {
            label: "退换",
            color: "#FFE6E1",
            sections: [
              {
                title: "退换流程",
                open: true,
                items: [
                  { title: "7 天退换", text: "支持 7 天无理由退换货，在订单页申请退款即可~" },
                  { title: "退货须知", text: "退货请保持商品原包装完好，不影响二次销售哦~" },
                ],
              },
              {
                title: "运费说明",
                items: [
                  { title: "质量换货", text: "质量问题换货运费由我们承担，帮您安排补发~" },
                  { title: "非质量退", text: "非质量问题退货，运费需买家自付，感谢您的理解~" },
                ],
              },
            ],
          },
          {
            label: "好评",
            color: "#FFF7DC",
            sections: [
              {
                title: "好评引导",
                open: true,
                items: [
                  { title: "请求好评", text: "亲，如果满意的话，期待您给我们一个五星好评哦！" },
                  { title: "好评答谢", text: "非常感谢您的好评！您的支持是我们前进的动力！" },
                  { title: "差评处理", text: "非常抱歉！请告知具体问题，我们第一时间为您解决~" },
                ],
              },
            ],
          },
        ],
      },
      {
        name: "售前答疑",
        categories: [
          {
            label: "产品咨询",
            color: "#E6E9FF",
            sections: [
              {
                title: "规格与适配",
                open: true,
                items: [
                  { title: "尺码推荐", text: "把身高体重发我，我帮您挑最合适的尺码~" },
                  { title: "通用适配", text: "这款适配主流机型，把您的型号发我，我帮您核对~" },
                ],
              },
              {
                title: "报价与赠品",
                items: [
                  { title: "满赠说明", text: "满 199 送小样，赠品随包裹一起发出~" },
                  { title: "对比建议", text: "这两款差别主要在用料，按您的需求我建议这款~" },
                ],
              },
            ],
          },
          {
            label: "库存与价格",
            color: "#FFF7DC",
            sections: [
              {
                title: "现货情况",
                open: true,
                items: [
                  { title: "库存查询", text: "现货还有库存，现在下单今天就安排发出~" },
                  { title: "缺货说明", text: "这个规格暂时缺货，预计 3 天补到，可以帮您先留一件~" },
                ],
              },
            ],
          },
        ],
      },
      {
        name: "大促活动",
        categories: [
          {
            label: "活动规则",
            color: "#FFE6E1",
            sections: [
              {
                title: "玩法说明",
                open: true,
                items: [
                  { title: "满减说明", text: "本次满减可跨店凑单，系统会自动减免，无需领券~" },
                  { title: "预售定金", text: "预售定金可抵更多金额，尾款在活动当天支付即可~" },
                ],
              },
              {
                title: "价格保护",
                items: [
                  { title: "保价说明", text: "活动期间下单支持 15 天保价，降价可申请退差~" },
                  { title: "优惠叠加", text: "店铺券与平台券可以叠加，下单自动抵扣~" },
                ],
              },
            ],
          },
          {
            label: "权益提醒",
            color: "#F1F8D8",
            sections: [
              {
                title: "别漏优惠",
                open: true,
                items: [
                  { title: "优惠券领取", text: "店铺首页还有一张券可以领，领完下单更划算哦~" },
                  { title: "秒杀提醒", text: "整点有秒杀名额，我提前提醒您，抢到就是赚到~" },
                ],
              },
            ],
          },
        ],
      },
      {
        name: "催付跟进",
        categories: [
          {
            label: "未付款",
            color: "#FFF1D6",
            sections: [
              {
                title: "温和催付",
                open: true,
                items: [
                  { title: "拍下未付", text: "看到您已经拍下啦，付款后我们马上安排发出哦~" },
                  { title: "尾款提醒", text: "您的预售尾款今天可以支付了，付完当天安排发货~" },
                ],
              },
              {
                title: "定金与尾款",
                items: [
                  { title: "定金说明", text: "定金不退但能抵更多，尾款记得活动当天付~" },
                  { title: "超时关闭", text: "未付款订单超时会自动关闭，要帮您重新开单吗？" },
                ],
              },
            ],
          },
          {
            label: "支付问题",
            color: "#F9D7D2",
            sections: [
              {
                title: "付不了款",
                open: true,
                items: [
                  { title: "支付失败", text: "支付失败多是限额或网络问题，换一种支付方式试试~" },
                  { title: "重复下单", text: "重复下单不影响，未付款的那笔超时后会自动关闭~" },
                ],
              },
            ],
          },
        ],
      },
      {
        name: "物流查询",
        categories: [
          {
            label: "发货时效",
            color: "#E3FBF7",
            sections: [
              {
                title: "什么时候发",
                open: true,
                items: [
                  { title: "48 小时发货", text: "付款后 48 小时内出库，出库后物流会更新揽收记录~" },
                  { title: "预售时效", text: "预售款按页面标注时间发出，不接急单请见谅~" },
                ],
              },
              {
                title: "签收提醒",
                items: [
                  { title: "派送提示", text: "包裹预计今天派送，注意接听派送电话~" },
                  { title: "代收说明", text: "需要放快递柜或驿站，提前跟我说一声~" },
                ],
              },
            ],
          },
          {
            label: "快递异常",
            color: "#E7EAEE",
            sections: [
              {
                title: "物流不动了",
                open: true,
                items: [
                  { title: "物流停滞", text: "已帮您催促快递，24 小时内会有新的物流记录~" },
                  { title: "派送失败", text: "派送失败多是联系不上，我帮您改约派送时间~" },
                ],
              },
            ],
          },
        ],
      },
      {
        name: "售后处理",
        categories: [
          {
            label: "质量问题",
            color: "#F9D7D2",
            sections: [
              {
                title: "先解决再谈责任",
                open: true,
                items: [
                  { title: "破损补发", text: "运输破损很抱歉，拍照发我，马上给您补发一件~" },
                  { title: "少发漏发", text: "少发漏发我们全责，核实后当天补发或退差价~" },
                ],
              },
              {
                title: "补偿口径",
                items: [
                  { title: "小额补偿", text: "这次补您一张 5 元无门槛券，算是我们的歉意~" },
                  { title: "二次回访", text: "补偿发出后 3 天我再回访一次，确认您满意~" },
                ],
              },
            ],
          },
          {
            label: "使用指导",
            color: "#DDF7EA",
            sections: [
              {
                title: "不会用",
                open: true,
                items: [
                  { title: "安装指导", text: "我发您一份图文步骤，照着做 3 分钟就能装好~", tag: "pdf" },
                  { title: "保养建议", text: "日常用软布擦拭即可，避免暴晒和长时间浸泡~" },
                ],
              },
            ],
          },
        ],
      },
      {
        name: "退换货",
        categories: [
          {
            label: "退货流程",
            color: "#FBE3EB",
            sections: [
              {
                title: "怎么退",
                open: true,
                items: [
                  { title: "退货入口", text: "在订单页点「申请售后 - 退货退款」提交即可~" },
                  { title: "退款时效", text: "签收后 1-3 个工作日退回原支付账户~" },
                ],
              },
              {
                title: "到货验收",
                items: [
                  { title: "验货提醒", text: "收到先检查外包装和配件，有问题第一时间拍给我~" },
                  { title: "退回进度", text: "您的退货已签收，退款 1-3 个工作日到账~" },
                ],
              },
            ],
          },
          {
            label: "换货补发",
            color: "#EEE6FA",
            sections: [
              {
                title: "换成想要的",
                open: true,
                items: [
                  { title: "换货流程", text: "把要换的规格发我，我帮您登记换货并优先发出~" },
                  { title: "补发运费", text: "我们的原因补发运费全包，您不用承担任何费用~" },
                ],
              },
            ],
          },
        ],
      },
      {
        name: "差评安抚",
        categories: [
          {
            label: "差评挽回",
            color: "#E9D3DC",
            sections: [
              {
                title: "先接住情绪",
                open: true,
                items: [
                  { title: "差评道歉", text: "看到您的评价我们心里也不好受，问题我负责到底~" },
                  { title: "补偿方案", text: "给您两个方案：全额退款或补发新品，您选一个~" },
                ],
              },
              {
                title: "沟通方式",
                items: [
                  { title: "私聊邀请", text: "方便的话我们私下沟通，我一定帮您处理到满意~" },
                  { title: "电话沟通", text: "约个方便的时间，我打电话跟您说清楚~" },
                ],
              },
            ],
          },
          {
            label: "中评引导",
            color: "#F5E6F4",
            sections: [
              {
                title: "还能更好",
                open: true,
                items: [
                  { title: "中评跟进", text: "您提到的问题我们已经改进，方便说说哪里还能更好吗？" },
                  { title: "好评邀请", text: "问题解决后如果满意，欢迎回来给我们一个好评~" },
                ],
              },
            ],
          },
        ],
      },
      {
        name: "发票优惠",
        categories: [
          {
            label: "发票",
            color: "#F2EEE6",
            sections: [
              {
                title: "开票口径",
                open: true,
                items: [
                  { title: "电子发票", text: "支持电子普票，下单备注或付款后把抬头发我即可~" },
                  { title: "发票抬头", text: "请把公司名称和税号发我，开好第一时间发给您~" },
                ],
              },
              {
                title: "开票时效",
                items: [
                  { title: "开票时间", text: "电子发票一般 24 小时内发到您邮箱~" },
                  { title: "补开发票", text: "之前忘开也没关系，订单号发我，我帮您补开~" },
                ],
              },
            ],
          },
          {
            label: "优惠券",
            color: "#FFF7DC",
            sections: [
              {
                title: "券的问题",
                open: true,
                items: [
                  { title: "券未生效", text: "券有使用门槛，帮您看了一下还差几元就能用~" },
                  { title: "叠加规则", text: "店铺券和平台券可以叠加，下单时系统会自动抵扣~" },
                ],
              },
            ],
          },
        ],
      },
      {
        name: "老客户维护",
        categories: [
          {
            label: "复购推荐",
            color: "#DDF7EA",
            sections: [
              {
                title: "回来看看",
                open: true,
                items: [
                  { title: "复购邀请", text: "您上次买的那款用完了吗？补货现在有老客价~" },
                  { title: "新品推荐", text: "新到了和您常买那款搭配的型号，要不要看看？" },
                ],
              },
              {
                title: "售后关怀",
                items: [
                  { title: "使用回访", text: "您用着还顺手吗？有不顺的地方跟我说~" },
                  { title: "耗材提醒", text: "配套耗材快用完了可以找我，老客有优惠~" },
                ],
              },
            ],
          },
          {
            label: "会员权益",
            color: "#F2E8FF",
            sections: [
              {
                title: "老客专属",
                open: true,
                items: [
                  { title: "积分兑换", text: "您的积分可以兑换小礼品，我帮您看看能换什么~" },
                  { title: "会员日", text: "会员日下单额外送赠品，当天提醒您别忘了~" },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  personal: {
    label: "个人话术",
    sets: [
      {
        name: "默认话术",
        categories: [
          {
            label: "常用",
            color: "#DDEFFB",
            sections: [
              {
                title: "我的常用",
                open: true,
                items: [
                  { title: "感谢购买", text: "感谢您的购买！收到商品后如有问题，随时联系我~", count: 12 },
                  { title: "礼品备注", text: "已为您在包裹内附上贺卡，祝收礼愉快！", count: 5 },
                  { title: "催好评", text: "亲，收到商品满意的话，欢迎给个五星好评哦~", count: 23 },
                ],
              },
              {
                title: "收尾短句",
                items: [
                  { title: "收到回复", text: "好的，收到~" },
                  { title: "收尾", text: "有需要随时找我~" },
                ],
              },
            ],
          },
          {
            label: "投诉",
            color: "#F9D7D2",
            sections: [
              {
                title: "投诉安抚",
                open: true,
                items: [
                  { title: "安抚先行", text: "非常抱歉给您添麻烦了！我立刻为您跟进处理，请您稍等~", count: 8 },
                  { title: "责任说明", text: "这个问题确实是我们的疏忽，已经记录，会严格改进~", count: 3 },
                ],
              },
              {
                title: "进度跟进",
                items: [
                  { title: "进度更新", text: "您好，您的问题我们已在跟进中，预计今天内给您回复~", count: 6 },
                  { title: "满意确认", text: "您好，您之前反馈的问题已处理，请问是否解决了呢？", count: 4 },
                ],
              },
            ],
          },
          {
            label: "VIP",
            color: "#F2E8FF",
            sections: [
              {
                title: "VIP 接待",
                open: true,
                items: [
                  { title: "专属问候", text: "您好，欢迎回来！作为尊贵客户，有任何需求优先为您服务~", count: 9 },
                  { title: "专属感谢", text: "感谢您一直以来的支持！这份信任是我们最大的动力~", count: 2 },
                ],
              },
              {
                title: "优先服务",
                items: [
                  { title: "加急处理", text: "您的订单已标记为优先处理，我们会第一时间安排发货~", count: 7 },
                  { title: "专属折扣", text: "作为老客户，这次可以为您申请额外的专属折扣哦~", count: 1 },
                ],
              },
            ],
          },
          {
            label: "资料",
            color: "#F2EEE6",
            sections: [
              {
                title: "产品资料",
                open: true,
                items: [
                  { title: "产品使用手册", text: "含安装、清洁与保养说明，可直接发给客户查阅~", tag: "pdf", count: 6 },
                  { title: "尺码对照表", text: "按身高体重对应尺码，回复咨询时先发这张表~", tag: "pdf", count: 4 },
                  { title: "产品详情图", text: "主图、细节图与实拍图合集，需要时直接发送~", tag: "image", count: 2 },
                ],
              },
            ],
          },
        ],
      },
      {
        name: "常用短句",
        categories: [
          {
            label: "口语短句",
            color: "#E6E9FF",
            sections: [
              {
                title: "日常应答",
                open: true,
                items: [
                  { title: "打招呼", text: "在的呢，您说~", count: 31 },
                  { title: "稍等", text: "稍等一下，我看下库存马上回您~", count: 18 },
                ],
              },
              {
                title: "语气短句",
                items: [
                  { title: "轻松收尾", text: "好嘞，那我先帮您安排上~" },
                  { title: "亲昵招呼", text: "又见面啦，今天想看点什么？" },
                ],
              },
            ],
          },
          {
            label: "结束语",
            color: "#F1F8D8",
            sections: [
              {
                title: "收尾",
                open: true,
                items: [
                  { title: "感谢咨询", text: "感谢您的咨询，祝您购物愉快！", count: 22 },
                  { title: "随时找我", text: "有任何问题随时找我，我都在的~", count: 9 },
                ],
              },
            ],
          },
        ],
      },
      {
        name: "售后口吻",
        categories: [
          {
            label: "我的安抚",
            color: "#F9D7D2",
            sections: [
              {
                title: "先说抱歉",
                open: true,
                items: [
                  { title: "抱歉开场", text: "实在不好意思，给您添麻烦了，我马上处理~", count: 14 },
                  { title: "承诺时限", text: "我今天内一定给您答复，不让您再等~", count: 6 },
                ],
              },
              {
                title: "我的说法",
                items: [
                  { title: "软化语气", text: "您先别急，这事我来盯~" },
                  { title: "明确时限", text: "今天 18 点前我给您消息~" },
                ],
              },
            ],
          },
          {
            label: "进度回复",
            color: "#E7EAEE",
            sections: [
              {
                title: "跟到底",
                open: true,
                items: [
                  { title: "已反馈", text: "已经帮您反馈上去了，有结果我第一时间告诉您~", count: 11 },
                  { title: "今天回复", text: "不用您催，处理好了我主动来找您~", count: 4 },
                ],
              },
            ],
          },
        ],
      },
      {
        name: "催付口吻",
        categories: [
          {
            label: "轻柔提醒",
            color: "#FFF1D6",
            sections: [
              {
                title: "不催急",
                open: true,
                items: [
                  { title: "订单未付", text: "看到您拍下了但还没付款，是不方便吗？", count: 7 },
                  { title: "库存提醒", text: "这个规格库存不多了，付款后我立刻帮您锁定~", count: 3 },
                ],
              },
              {
                title: "给个台阶",
                items: [
                  { title: "是不是卡住了", text: "是不是遇到支付问题了？我帮您看看~" },
                  { title: "订单留着", text: "我先帮您把订单留着，别急~" },
                ],
              },
            ],
          },
          {
            label: "优惠提醒",
            color: "#FFF7DC",
            sections: [
              {
                title: "别错过",
                open: true,
                items: [
                  { title: "优惠快结束", text: "优惠还有两小时结束，等下就恢复原价了~", count: 5 },
                  { title: "帮算价格", text: "我帮您算了一下，现在下单还能再省一点~", count: 2 },
                ],
              },
            ],
          },
        ],
      },
      {
        name: "活动话术",
        categories: [
          {
            label: "活动介绍",
            color: "#FFE6E1",
            sections: [
              {
                title: "讲清楚",
                open: true,
                items: [
                  { title: "怎么参加", text: "活动不用报名，下单时系统自动按活动价算~", count: 8 },
                  { title: "满减怎么算", text: "满 200 减 30，凑到 200 就自动减，可以跨店~", count: 5 },
                ],
              },
              {
                title: "帮客户算账",
                items: [
                  { title: "算到手价", text: "我帮您算了一下到手价，比平时省不少~" },
                  { title: "凑单建议", text: "再加一件就到下一档满减，划得来~" },
                ],
              },
            ],
          },
          {
            label: "下单引导",
            color: "#FBE3EB",
            sections: [
              {
                title: "促成",
                open: true,
                items: [
                  { title: "帮您算好价", text: "我帮您算好了，到手价比平时低不少~", count: 6 },
                  { title: "现在下单", text: "现在下单今天就能发出，早买早到~", count: 4 },
                ],
              },
            ],
          },
        ],
      },
      {
        name: "物流话术",
        categories: [
          {
            label: "查询回复",
            color: "#E3FBF7",
            sections: [
              {
                title: "查得到",
                open: true,
                items: [
                  { title: "已发货", text: "已经发出啦，单号我发您，随时能查~", count: 12 },
                  { title: "单号给到", text: "单号在这：{单号}，有异常直接找我~", count: 6 },
                ],
              },
              {
                title: "主动跟进",
                items: [
                  { title: "报进度", text: "我刚查了物流，今天会更新~" },
                  { title: "派送联系", text: "我让快递到了给您打电话~" },
                ],
              },
            ],
          },
          {
            label: "异常处理",
            color: "#E7EAEE",
            sections: [
              {
                title: "我帮您催",
                open: true,
                items: [
                  { title: "物流慢", text: "我已经帮您催件了，正常 24 小时内会更新~", count: 9 },
                  { title: "催快递", text: "这家网点最近慢，我换个方式帮您跟一下~", count: 3 },
                ],
              },
            ],
          },
        ],
      },
      {
        name: "安抚话术",
        categories: [
          {
            label: "情绪安抚",
            color: "#FBE3EB",
            sections: [
              {
                title: "先共情",
                open: true,
                items: [
                  { title: "理解您的着急", text: "换我我也着急，这事我跟到底~", count: 10 },
                  { title: "我来跟进", text: "您不用再重复说一遍，我这边全程负责~", count: 5 },
                ],
              },
              {
                title: "我的处理",
                items: [
                  { title: "我负责到底", text: "这事我记下了，不会让您再催第二遍~" },
                  { title: "先解决后复盘", text: "先给您解决，后面我们内部再复盘~" },
                ],
              },
            ],
          },
          {
            label: "补偿口径",
            color: "#E9D3DC",
            sections: [
              {
                title: "怎么补",
                open: true,
                items: [
                  { title: "补偿方案", text: "这次给您补发一份小礼品，算是我们的歉意~", count: 4 },
                  { title: "下次注意", text: "已经反馈给仓库，同样的错误不会再有~", count: 2 },
                ],
              },
            ],
          },
        ],
      },
      {
        name: "老客户",
        categories: [
          {
            label: "熟客问候",
            color: "#DDF7EA",
            sections: [
              {
                title: "认得您",
                open: true,
                items: [
                  { title: "老朋友来了", text: "又是您呀，看到订单就知道是老朋友~", count: 6 },
                  { title: "老客优惠", text: "老客户我给您申请个小优惠，别嫌少~", count: 3 },
                ],
              },
              {
                title: "我的记录",
                items: [
                  { title: "备注喜好", text: "已经给您备注了，以后都按这个来~" },
                  { title: "补货提醒", text: "上次那款快用完了吧？要的话我帮您留~" },
                ],
              },
            ],
          },
          {
            label: "复购提醒",
            color: "#F1F8D8",
            sections: [
              {
                title: "该补货了",
                open: true,
                items: [
                  { title: "补货提醒", text: "按您的用量算，差不多该补货了~", count: 4 },
                  { title: "留着名额", text: "先帮您留着，什么时候要跟我说一声~", count: 2 },
                ],
              },
            ],
          },
        ],
      },
      {
        name: "应急备用",
        categories: [
          {
            label: "系统异常",
            color: "#E7EAEE",
            sections: [
              {
                title: "顶一下",
                open: true,
                items: [
                  { title: "网络不稳", text: "我这边网络有点卡，稍等我重新回复您~", count: 2 },
                  { title: "稍后回复", text: "系统正在处理，稍后我把结果发给您~", count: 1 },
                ],
              },
              {
                title: "我的应急",
                items: [
                  { title: "电脑卡了", text: "我这边卡了一下，马上回您~" },
                  { title: "手动补上", text: "稍等我手动打给您，别急~" },
                ],
              },
            ],
          },
          {
            label: "交接班",
            color: "#F2EEE6",
            sections: [
              {
                title: "无缝交接",
                open: true,
                items: [
                  { title: "同事接手", text: "我这边要交接了，同事会继续帮您跟进~", count: 3 },
                  { title: "我转给同事", text: "已经把事情交代给同事了，您不用担心~", count: 2 },
                ],
              },
            ],
          },
        ],
      },
      {
        name: "临时记录",
        categories: [
          {
            label: "待补充",
            color: "#F5F3EF",
            sections: [
              {
                title: "还没定",
                open: true,
                items: [
                  { title: "待确认口径", text: "（草稿）这个说法还没确认，先别用~", count: 1 },
                  { title: "待请示主管", text: "（草稿）需要请示主管后再回复客户~", count: 1 },
                ],
              },
              {
                title: "我的草稿",
                items: [
                  { title: "待改口语", text: "（草稿）这句太正式，改成口语再发~" },
                  { title: "待补图", text: "（草稿）这条要补一张图才发~" },
                ],
              },
            ],
          },
          {
            label: "草稿",
            color: "#F2EEE6",
            sections: [
              {
                title: "改一改再用",
                open: true,
                items: [
                  { title: "待改文案", text: "（草稿）这句还是太长，改短一点再发~", count: 2 },
                  { title: "备用版本", text: "（草稿）留着备用，正式口径看团队话术~", count: 1 },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  local: {
    label: "离线话术",
    sets: [
      {
        name: "默认话术",
        categories: [
          {
            label: "常见问题",
            color: "#DDEFFB",
            sections: [
              {
                title: "快捷问答",
                open: true,
                items: [
                  { title: "发货时间", text: "当天 16 点前付款当天发货，之后的顺延到次日发出~" },
                  { title: "是否包邮", text: "全场满 59 元包邮，偏远地区需补少量运费哦~" },
                  { title: "发票说明", text: "支持开具电子发票，下单备注单位名称即可~", tag: "pdf" },
                ],
              },
              {
                title: "配送相关",
                items: [
                  { title: "配送范围", text: "全国大部分地区可发，偏远地区需补运费~" },
                  { title: "到货时效", text: "一般 3-5 天到货，偏远地区 5-7 天~" },
                ],
              },
            ],
          },
          {
            label: "售后政策",
            color: "#DDF7EA",
            sections: [
              {
                title: "退换规则",
                open: true,
                items: [
                  { title: "7 天无理由", text: "签收后 7 天内可无理由退换，商品需不影响二次销售~" },
                  { title: "运费承担", text: "质量问题由我们承担往返运费，非质量问题买家承担~" },
                ],
              },
            ],
          },
        ],
      },
      {
        name: "断网备用",
        categories: [
          {
            label: "纯文本常用",
            color: "#E7EAEE",
            sections: [
              {
                title: "不联网也能发",
                open: true,
                items: [
                  { title: "发货时间", text: "付款后 48 小时内发货，节假日顺延~" },
                  { title: "是否包邮", text: "满 59 元包邮，偏远地区补差价~" },
                ],
              },
              {
                title: "纯文本兜底",
                items: [
                  { title: "无图版本", text: "（纯文本）质量问题我们包退换~" },
                  { title: "无附件版本", text: "（纯文本）安装要点：先装底座再通电~" },
                ],
              },
            ],
          },
          {
            label: "联系不上",
            color: "#F2EEE6",
            sections: [
              {
                title: "先应一下",
                open: true,
                items: [
                  { title: "稍后回复", text: "您的消息收到了，核实后马上回您~" },
                  { title: "电话沟通", text: "方便留个电话吗？我打给您说更清楚~" },
                ],
              },
            ],
          },
        ],
      },
      {
        name: "售前备用",
        categories: [
          {
            label: "咨询答复",
            color: "#E6E9FF",
            sections: [
              {
                title: "标准口径",
                open: true,
                items: [
                  { title: "正品保障", text: "官方正品，支持验货，假一赔十~" },
                  { title: "优惠说明", text: "店铺长期有券，下单前记得先领~" },
                ],
              },
              {
                title: "离线应答",
                items: [
                  { title: "标准回答", text: "（离线）正品保障，支持验货~" },
                  { title: "缺货回答", text: "（离线）这个规格暂时缺货，到货通知您~" },
                ],
              },
            ],
          },
          {
            label: "报价口径",
            color: "#FFF7DC",
            sections: [
              {
                title: "不松口",
                open: true,
                items: [
                  { title: "统一价", text: "价格全国统一，我们不做私下议价~" },
                  { title: "不议价", text: "已经是最低价了，再低就亏本啦~" },
                ],
              },
            ],
          },
        ],
      },
      {
        name: "售后备用",
        categories: [
          {
            label: "售后答复",
            color: "#F9D7D2",
            sections: [
              {
                title: "别承诺过头",
                open: true,
                items: [
                  { title: "退款时效", text: "退款按平台流程 1-3 个工作日到账，不是我方能加快~" },
                  { title: "换货条件", text: "换货需包装完好、配件齐全，否则只能维修~" },
                ],
              },
              {
                title: "离线口径",
                items: [
                  { title: "退款口径", text: "（离线）退款 1-3 个工作日，按平台流程走~" },
                  { title: "换货口径", text: "（离线）换货需包装完好、配件齐全~" },
                ],
              },
            ],
          },
          {
            label: "运费口径",
            color: "#DDF7EA",
            sections: [
              {
                title: "谁出运费",
                open: true,
                items: [
                  { title: "质量我们出", text: "质量问题我们承担运费，请保留寄件凭证~" },
                  { title: "非质量买家出", text: "非质量问题退货运费买家承担，敬请理解~" },
                ],
              },
            ],
          },
        ],
      },
      {
        name: "大促备用",
        categories: [
          {
            label: "活动应答",
            color: "#FFE6E1",
            sections: [
              {
                title: "活动期间",
                open: true,
                items: [
                  { title: "满减口径", text: "活动满减以页面显示为准，系统自动计算~" },
                  { title: "赠品说明", text: "赠品数量有限，送完即止，不单独补发~" },
                ],
              },
              {
                title: "大促问答",
                items: [
                  { title: "定金问题", text: "（离线）定金不退但可抵更多~" },
                  { title: "价保问题", text: "（离线）价保 15 天，降价可退差~" },
                ],
              },
            ],
          },
          {
            label: "延迟说明",
            color: "#FFF1D6",
            sections: [
              {
                title: "先打预防针",
                open: true,
                items: [
                  { title: "发货会慢", text: "大促期间订单多，发货会慢 1-2 天，请耐心等待~" },
                  { title: "物流会慢", text: "大促期间快递压力大，物流更新会比平时慢~" },
                ],
              },
            ],
          },
        ],
      },
      {
        name: "客服轮班",
        categories: [
          {
            label: "交接说明",
            color: "#F2EEE6",
            sections: [
              {
                title: "班次交接",
                open: true,
                items: [
                  { title: "同事接手", text: "我这边下班了，同事会接着帮您处理~" },
                  { title: "事情已交代", text: "您的情况我已经写清楚交给同事了~" },
                ],
              },
              {
                title: "交接口径",
                items: [
                  { title: "交接清单", text: "（离线）未处理 3 单，已写交接备注~" },
                  { title: "留言回复", text: "（离线）已留言，上班第一时间回您~" },
                ],
              },
            ],
          },
          {
            label: "夜间回复",
            color: "#E7EAEE",
            sections: [
              {
                title: "非工作时间",
                open: true,
                items: [
                  { title: "明天 9 点", text: "客服在线时间是 9:00-23:00，明早我第一时间回您~" },
                  { title: "自助下单", text: "夜间可以自助下单，白天我帮您跟单~" },
                ],
              },
            ],
          },
        ],
      },
      {
        name: "常见问答",
        categories: [
          {
            label: "支付问题",
            color: "#FBE3EB",
            sections: [
              {
                title: "钱的事",
                open: true,
                items: [
                  { title: "支付失败", text: "支付失败请先查限额，或换一种支付方式~" },
                  { title: "重复付款", text: "重复付款会原路退回，一般 1-3 个工作日到账~" },
                ],
              },
              {
                title: "常规问答",
                items: [
                  { title: "支付方式", text: "（离线）支持微信、支付宝、银行卡~" },
                  { title: "配送范围", text: "（离线）全国大部分地区可发，偏远地区除外~" },
                ],
              },
            ],
          },
          {
            label: "地址修改",
            color: "#E6E9FF",
            sections: [
              {
                title: "改地址",
                open: true,
                items: [
                  { title: "未发货改地址", text: "还没发货，把新地址发我，我帮您在后台改~" },
                  { title: "已发货改地址", text: "已发货只能联系快递改派，可能产生费用~" },
                ],
              },
            ],
          },
        ],
      },
      {
        name: "违规风险",
        categories: [
          {
            label: "禁语提醒",
            color: "#F9D7D2",
            sections: [
              {
                title: "别踩线",
                open: true,
                items: [
                  { title: "不做承诺", text: "不承诺绝对效果、不保证最便宜，避免纠纷~" },
                  { title: "不诋毁同行", text: "不评价同行产品，只讲自己的优势~" },
                ],
              },
              {
                title: "合规话术",
                items: [
                  { title: "不夸大", text: "（合规）效果因人而异，请按说明使用~" },
                  { title: "不承诺赔偿", text: "（合规）赔偿按平台规则执行~" },
                ],
              },
            ],
          },
          {
            label: "客诉升级",
            color: "#E9D3DC",
            sections: [
              {
                title: "处理不了就上报",
                open: true,
                items: [
                  { title: "转主管", text: "这个情况我帮您升级给主管处理~" },
                  { title: "同步记录", text: "您的诉求我原样记下来了，不会漏~" },
                ],
              },
            ],
          },
        ],
      },
      {
        name: "临时政策",
        categories: [
          {
            label: "特殊时期",
            color: "#F5F3EF",
            sections: [
              {
                title: "时效变化",
                open: true,
                items: [
                  { title: "特殊时期时效", text: "特殊时期部分地区时效延长 1-3 天~" },
                  { title: "停发地区", text: "受限地区暂时停发，恢复后我们第一时间发出~" },
                ],
              },
              {
                title: "政策口径",
                items: [
                  { title: "临时调整", text: "（临时）本周发货时效延长 1 天~" },
                  { title: "恢复通知", text: "（临时）时效已恢复正常，48 小时内发出~" },
                ],
              },
            ],
          },
          {
            label: "补偿上限",
            color: "#FFF7DC",
            sections: [
              {
                title: "能补多少",
                open: true,
                items: [
                  { title: "最高补偿", text: "小额补偿上限是订单金额的 10%~" },
                  { title: "补偿需留痕", text: "补偿需要截图留档，方便后续核对~" },
                ],
              },
            ],
          },
        ],
      },
      {
        name: "备份话术",
        categories: [
          {
            label: "备用文案",
            color: "#F2E8FF",
            sections: [
              {
                title: "老版本",
                open: true,
                items: [
                  { title: "旧欢迎语", text: "亲，欢迎光临本店，请问有什么可以帮您？（旧版）" },
                  { title: "旧结束语", text: "感谢光临，期待再次为您服务！（旧版）" },
                ],
              },
              {
                title: "老版本留档",
                items: [
                  { title: "旧欢迎语", text: "（旧版）欢迎光临，请问有什么可以帮您？" },
                  { title: "旧结束语", text: "（旧版）感谢光临，期待再次为您服务~" },
                ],
              },
            ],
          },
          {
            label: "归档",
            color: "#E7EAEE",
            sections: [
              {
                title: "已停用",
                open: true,
                items: [
                  { title: "停用话术", text: "（已停用）这条口径不再使用，仅作留档~" },
                  { title: "旧政策", text: "（已停用）旧版退换政策说明~" },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
};

const esc = (value) =>
  String(value).replace(
    /[&<>"]/g,
    (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch],
  );

/* 话术行标记：首页首屏静态 HTML 与运行时渲染共用（数字序号只有数字选择态才传）。 */
const rowHtml = (item, key, path, shortcut = "") => `
    <div class="app-row" role="button" tabindex="0" data-key="${key}" title="双击贴进输入框，点左侧纸飞机直接发送">
      <button class="app-row-send" type="button" data-send="${key}" aria-label="直接发送这条话术" title="直接发送（粘贴 + 回车）">
        <svg viewBox="0 0 14 14" aria-hidden="true"><path d="M1 7 L13 1 L7 7 L13 13 Z" /><path d="M7 7 L13 1" /></svg>
      </button>
      <span class="app-row-body">
        <span class="app-row-main">
          ${shortcut ? `<span class="app-row-digit">${shortcut}</span>` : ""}
          ${item.tag ? `<img class="app-row-icon" src="${TYPE_ICONS[item.tag]}" alt="" />` : ""}
          <span class="app-row-title">${esc(item.title)}</span>
          ${typeof item.count === "number" ? `<span class="app-row-count">${item.count}</span>` : ""}
        </span>
        <span class="app-row-text">${esc(item.text)}</span>
        ${path ? `<span class="app-row-path">${esc(path)}</span>` : ""}
      </span>
    </div>`;


/* 一级分类 → 二级分类 → 话术行。返回 { html, items }：items 是当前展开的话术，
   数字选择态与点行发送按这个顺序取第 N 条。 */
const treeHtml = (category) => {
  if (!category) return { html: `<p class="app-empty">暂无话术</p>`, items: [] };
  const items = [];
  const parts = category.sections.map((section, sectionIndex) => {
    const head = `<div class="app-lv2">
      <div class="app-lv2-head" role="button" tabindex="0" data-section="${sectionIndex}" aria-expanded="${section.open ? "true" : "false"}" title="点一下展开或收起这一组">
        <span class="app-lv2-arrow" aria-hidden="true">${section.open ? "▼" : "▶"}</span>
        <span class="app-lv2-title">${esc(section.title)}</span>
      </div>`;
    const body = section.open
      ? section.items
          .map((item) => {
            items.push(item);
            return rowHtml(item, items.length - 1, "");
          })
          .join("")
      : "";
    return `${head}${body}</div>`;
  });
  return { html: parts.join(""), items };
};

/* 首页首屏预渲染用的那一套：客户端默认就是团队话术第 0 套的第一个一级分类。 */
const initialTreeHtml = () => treeHtml(SCOPES.team.sets[0].categories[0]).html;

/* 浏览器挂到 window，Node（构建脚本）拿到 module.exports。 */
const DEMO = { SCOPES, TYPE_ICONS, esc, rowHtml, treeHtml, initialTreeHtml };
if (typeof module !== "undefined" && module.exports) module.exports = DEMO;
else globalThis.SOFTTALK_DEMO = DEMO;
