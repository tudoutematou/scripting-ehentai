import { Picker, Section, Stepper, Text, Toggle } from "scripting"
import type { ReaderPreferences } from "./libraryStore"

export function ReaderPreferenceSections({prefs,onChange}:{prefs:ReaderPreferences;onChange:(update:Partial<ReaderPreferences>)=>void}){
  const directionHelp=prefs.direction==="rtl"?"右滑下一页 · 左滑上一页":"左滑下一页 · 右滑上一页"
  return <>
    <Section header={<Text textCase={null}>阅读模式</Text>} footer={<Text>连续纵向阅读会关闭单页自动翻页。</Text>}>
      <Picker title="阅读模式" pickerStyle="segmented" value={prefs.layout} onChanged={(layout:string)=>onChange({layout:layout as ReaderPreferences["layout"]})}>
        <Text tag="single">单页阅读</Text>
        <Text tag="continuous">连续纵向</Text>
      </Picker>
    </Section>
    <Section header={<Text textCase={null}>阅读方向</Text>} footer={<Text>{directionHelp}</Text>}>
      <Picker title="阅读方向" pickerStyle="inline" value={prefs.direction} onChanged={(direction:string)=>onChange({direction:direction as ReaderPreferences["direction"]})}>
        <Text tag="ltr">从左到右</Text>
        <Text tag="rtl">从右到左</Text>
      </Picker>
    </Section>
    <Section title="图片显示">
      <Toggle title="适应屏幕" value={prefs.fit==="screen"} onChanged={enabled=>onChange({fit:enabled?"screen":"width"})}/>
      <Toggle title="优先原图" value={prefs.preferOriginal} onChanged={preferOriginal=>onChange({preferOriginal})}/>
    </Section>
    <Section title="加载">
      <Stepper title={`相邻预加载：${prefs.preload}`} onIncrement={()=>onChange({preload:Math.min(4,prefs.preload+1)})} onDecrement={()=>onChange({preload:Math.max(0,prefs.preload-1)})}/>
    </Section>
    <Section header={<Text textCase={null}>自动阅读</Text>} footer={<Text>阅读器中的播放与暂停使用这里设置的间隔。</Text>}>
      <Stepper title={`自动翻页间隔：${prefs.autoPageSeconds} 秒`} onIncrement={()=>onChange({autoPageSeconds:Math.min(30,prefs.autoPageSeconds+1)})} onDecrement={()=>onChange({autoPageSeconds:Math.max(2,prefs.autoPageSeconds-1)})}/>
    </Section>
  </>
}
