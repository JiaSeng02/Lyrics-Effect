/**
 * 解释歌词字符串
 * 得到一个歌词对象的数组
 * 每个歌词对象： {time：开始时间， words：歌词内容}
 */
function parseLrc() {
  var lines = lrc.split("\n");
  var result = []; //歌词对象数组

  for (
    var i = 0;
    i < lines.length;
    i++ //for every line of lyrics
  ) {
    var str = lines[i];
    var parts = str.split("]"); //split two component by ']'
    var timeStr = parts[0].substring(1); //throw the first symbol '['
    //Result: 02:33.98 --> timeStr
    var obj = {
      time: parseTime(timeStr),
      words: parts[1],
    };
    result.push(obj);
  }
  return result;
}

/**
 * 将时间字符串解析为时间（秒）
 * @param {*} timeStr 时间字符串
 * @returns 时间
 */
function parseTime(timeStr) {
  var parts = timeStr.split(":"); //Now separate the minute and second
  return +parts[0] * 60 + +parts[1]; //put '+' infront will auto change the element into number type
}

var lrcData = parseLrc();

//获取需要的 dom
var doms = {
  audio: document.querySelector("audio"),
  ul: document.querySelector(".container ul"),
  container: document.querySelector(".container"),
};

/**
 * 计算出， 在当前播放去播放到底几秒的情况下
 * lrcData数组中，应该高亮显示的歌词
 * 如果没有任何一句歌词需要显示，则得到-1 （0秒)
 */
function findIndex() {
  var curTime = doms.audio.currentTime; //播放器当前时间
  for (var i = 0; i < lrcData.length; i++) {
    if (curTime < lrcData[i].time) {
      //为什么 -1
      //还没到那句歌词的时间，所以还是显示上一句
      return i - 1;
    }
  }
  //找遍了都没找到 （说明已经到最后一句）
  return lrcData.length - 1;
}

//界面

/**
 * 创建歌词列表元素 li
 */
function createElements() {
  //优化效率问题
  //可以先把words element放进frag
  //再把frag一次性放进 doms 树 （解决频繁改动 doms 树的问题）
  var frag = document.createDocumentFragment(); //创建文档片段

  for (var i = 0; i < lrcData.length; i++) {
    var li = document.createElement("li");
    li.textContent = lrcData[i].words;

    //doms.ul.appendChild(li); //改动了 doms 树 --> 可能会有效率问题 （太多data，频繁改动 doms 树）

    frag.appendChild(li); //先把element放进frag文档
  }
  doms.ul.appendChild(frag); //在一次性改动 doms 树
}

createElements();

// 容器高度
var containerHeight = doms.container.clientHeight;

// 子元素 li 的高度
var liHeight = doms.ul.children[0].clientHeight;

//最大的offset （让最后一句 不要在中间）
var maxOffset = doms.ul.clientHeight - containerHeight;

/**
 * 设置 ul 元素的偏移量
 */
function setOffset() {
  var index = findIndex();
  var offset = liHeight * index + liHeight / 2 - containerHeight / 2;

  if (offset < 0) {
    offset = 0;
  }

  if (offset > maxOffset) {
    offset = maxOffset;
  }

  doms.ul.style.transform = `translateY(-${offset}px)`;

  //去掉之前的 active 样式
  var li = doms.ul.querySelector(".active");
  if (li) {
    li.classList.remove("active");
  }

  //把那句歌词变 active
  var li = doms.ul.children[index];
  if (li) {
    //两个方法都可以用
    //li.className = 'active';
    li.classList.add("active");
  }

  console.log(offset);
}

doms.audio.addEventListener("timeupdate", setOffset);

const cvs = document.querySelector("canvas");
const ctx = cvs.getContext("2d");

function initCvs() {
  cvs.width = window.innerWidth * devicePixelRatio;
  cvs.height = (window.innerHeight / 2) * devicePixelRatio;
}

initCvs();

let isInit = false;
let analyser = null;
let buffer = null;
var Audio = doms.audio;

Audio.addEventListener("play", () => {
  if (isInit) return;
  //初始化
  const audioCtx = new AudioContext(); //音频上下文
  const source = audioCtx.createMediaElementSource(Audio); //音频节点

  analyser = audioCtx.createAnalyser(); //音频分析节点
  source.connect(analyser);
  analyser.fftSize = 512;
  buffer = new Uint8Array(analyser.frequencyBinCount); //类型化数组 /2

  analyser.connect(audioCtx.destination);
  isInit = true;
});

function draw() {
  requestAnimationFrame(draw);
  if (!isInit) return;

  // 清空画布
  const { width, height } = cvs;
  ctx.clearRect(0, 0, width, height);

  analyser.getByteFrequencyData(buffer);

  const len = buffer.length / 2.5;
  const count = len * 2;
  const barWidth = width / count; // 单根柱状图的宽度

  for (let i = 0; i < len; i++) {
    //画柱状图
    const v = buffer[i];
    const barHeight = (v / 255) * height;
    const x1 = i * barWidth + width / 2;
    const x2 = width / 2 - (i + 1) * barWidth;
    const y = height - barHeight;

    // ** Dynamic Color Calculation **
    // Hue shifts from 240 (blue) to 0 (red) based on height
    const hue = (v / 255) * 240; // 240 = blue, 0 = red
    ctx.fillStyle = `hsl(${hue}, 100%, 40%)`;

    ctx.fillRect(x1, y, barWidth - 1, barHeight);
    ctx.fillRect(x2, y, barWidth - 1, barHeight);
  }
}

draw();
