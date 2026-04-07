/**
 * Style definitions for Voice Buddy.
 * Each style has TTS voice settings and message templates.
 */

export interface Style {
  id: string;
  name: string;
  voice: string;       // edge-tts voice ID
  rate: string;       // e.g. "+10%"
  pitch: string;      // e.g. "+0Hz"
  defaultNickname: string;
  templates: StyleTemplates;
}

export interface StyleTemplates {
  sessionstart: string[];
  sessionend: string[];
  notification: string[];
  posttooluse: Record<string, string[]>;
  stop: string[];  // 任务完成播报前缀
}

export const STYLES: Record<string, Style> = {
  'cute-girl': {
    id: 'cute-girl',
    name: '萌妹 · 可爱',
    voice: 'zh-CN-XiaoyiNeural',
    rate: '+10%',
    pitch: '+5Hz',
    defaultNickname: 'Master',
    templates: {
      sessionstart: [
        '欢迎回来，今天也要加油哦~',
        '来啦来啦！开始干活吧~',
        '又见面啦，今天心情怎么样~',
        '开工开工~一起加油吧！',
      ],
      sessionend: [
        '辛苦啦！下次见哦~',
        '拜拜~好好休息呢',
        '今天也很努力呢，晚安~',
        '收工啦~明天见！',
      ],
      notification: [
        '{{nickname}}，过来看一下呢~',
        '{{nickname}}，这边需要你确认一下哟~',
        '{{nickname}}，有事情需要你看一下哦~',
      ],
      posttooluse: {
        test_passed: ['太棒了！测试全过了呢~', '测试全过啦，好厉害！'],
        file_written: ['文件写好了呢~', '搞定啦，文件已保存~'],
        git_commit: ['代码提交成功咯~', '提交完成，加油加油！'],
        git_push: ['代码飞出去啦~', '推送成功！'],
        default: ['搞定啦~', '完成了呢~'],
      },
      stop: [
        '好的 {{nickname}}，帮你搞定啦',
        '{{nickname}}，已经完成啦~',
        '帮你做好啦，{{nickname}}~',
        '{{nickname}}，全部搞定咯！',
      ],
    },
  },
  'elegant-lady': {
    id: 'elegant-lady',
    name: '优雅 · 知性',
    voice: 'zh-CN-XiaoxiaoNeural',
    rate: '+0%',
    pitch: '+0Hz',
    defaultNickname: 'Master',
    templates: {
      sessionstart: [
        '你来啦，我已经准备好了',
        '欢迎回来，今天也一起加油',
        '准备好了，随时可以开始',
      ],
      sessionend: [
        '辛苦了，好好休息一下',
        '今天做得很好，下次见',
        '收工了，记得早点休息',
      ],
      notification: [
        '{{nickname}}，来看一下这个',
        '{{nickname}}，需要你确认一下',
        '{{nickname}}，过来帮忙看看',
      ],
      posttooluse: {
        test_passed: ['太棒了，测试全部通过！'],
        file_written: ['文件写好了呢~'],
        git_commit: ['提交完成，加油！'],
        git_push: ['推送成功！'],
        default: ['搞定啦~'],
      },
      stop: [
        '好的 {{nickname}}，已经完成了',
        '{{nickname}}，任务搞定',
        '已为您完成，{{nickname}}~',
        '{{nickname}}，全部就绪',
      ],
    },
  },
  'warm-boy': {
    id: 'warm-boy',
    name: '暖男 · 体贴',
    voice: 'zh-CN-YunxiNeural',
    rate: '+0%',
    pitch: '-2Hz',
    defaultNickname: 'Master',
    templates: {
      sessionstart: [
        '欢迎回来，准备好了吗？',
        '又见面了，今天也一起努力吧',
        '来了呢，那我们开始吧',
      ],
      sessionend: [
        '辛苦了，好好休息',
        '今天的工作告一段落了',
        '注意休息，别太累了',
      ],
      notification: [
        '{{nickname}}，这边需要你看一下',
        '{{nickname}}，麻烦过来确认一下',
        '{{nickname}}，有需要你处理的事情',
      ],
      posttooluse: {
        test_passed: ['测试全部通过，很棒！'],
        file_written: ['文件写好了~'],
        git_commit: ['提交完成，加油！'],
        git_push: ['推送成功！'],
        default: ['搞定啦~'],
      },
      stop: [
        '{{nickname}}，已经帮你完成了',
        '搞定了，{{nickname}}，辛苦了',
        '{{nickname}}，任务全部搞定',
        '好了，{{nickname}}，休息一下吧',
      ],
    },
  },
  secretary: {
    id: 'secretary',
    name: '秘书 · 专业',
    voice: 'en-US-JennyNeural',
    rate: '+0%',
    pitch: '+0Hz',
    defaultNickname: 'Boss',
    templates: {
      sessionstart: [
        'Good morning, ready to start',
        'Welcome back, let\'s get to work',
        'Session started, standing by',
      ],
      sessionend: [
        'Session complete, good work',
        'Wrapping up, see you next time',
        'All done for now, take care',
      ],
      notification: [
        '{{nickname}}, your attention is needed',
        '{{nickname}}, please take a look at this',
        '{{nickname}}, I need your confirmation here',
      ],
      posttooluse: {
        test_passed: ['All tests passed, great work!'],
        file_written: ['File saved successfully'],
        git_commit: ['Commit successful'],
        git_push: ['Push complete'],
        default: ['Done.', 'Completed.'],
      },
      stop: [
        '{{nickname}}, task completed',
        '{{nickname}}, all done here',
        'Completed, {{nickname}}',
        'Done, {{nickname}}, you\'re all set',
      ],
    },
  },
  kawaii: {
    id: 'kawaii',
    name: '元气 · 日语',
    voice: 'ja-JP-NanamiNeural',
    rate: '+10%',
    pitch: '+5Hz',
    defaultNickname: 'Senpai',
    templates: {
      sessionstart: [
        'おかえりなさい！今日も頑張ろうね~',
        '来てくれた！嬉しいな~',
        'また会えたね、始めよう！',
      ],
      sessionend: [
        'お疲れ様！また会おうね~',
        'バイバイ、ゆっくり休んでね',
        '今日をよく頑張ったね！',
      ],
      notification: [
        '{{nickname}}、ちょっと来てほしいな~',
        '{{nickname}}、確認してほしいことがあるの',
        '{{nickname}}、こっち見てくれる？',
      ],
      posttooluse: {
        test_passed: ['テスト全部通ったよ！'],
        file_written: ['ファイルできた~'],
        git_commit: ['コミット完了~'],
        git_push: ['プッシュしたよ~'],
        default: ['できた~', '搞定~'],
      },
      stop: [
        '{{nickname}}、できたよ~',
        '{{nickname}}、 завершено 啦~',
        '{{nickname}}、やり遂げたね~',
        '搞定~ {{nickname}}、お疲れ様~',
      ],
    },
  },
};

export function getStyle(id: string): Style | undefined {
  return STYLES[id];
}

export function listStyles(): Style[] {
  return Object.values(STYLES);
}
