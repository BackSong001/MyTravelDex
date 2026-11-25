import React from 'react';
import {Animated, StyleSheet, View} from 'react-native';
import Svg, {Circle, Ellipse, G, Path, Rect} from 'react-native-svg';

const ink = '#48382D';
export const companions = {
  squirrel:{name:'안경 다람쥐', fur:'#DFA674', cream:'#FFE7C3'},
  cat:{name:'배낭 고양이', fur:'#FFF8E6', cream:'#FFFDF3'},
  otter:{name:'탐험 수달', fur:'#CAAC83', cream:'#F5E5BF'},
  beaver:{name:'여행 비버', fur:'#BB8968', cream:'#F6DBC0'},
} as const;
export type Companion = keyof typeof companions;
const outline = {stroke:ink, strokeWidth:2.6, strokeLinecap:'round', strokeLinejoin:'round'} as const;
const width = 216, height = 180;

function Drawing({children}:React.PropsWithChildren) {
  return <Svg width={width} height={height} viewBox="0 0 216 180" accessible={false}>{children}</Svg>;
}

function TrailHat() {
  return <G rotation={-6} origin="103,53">
          <Path d="M74 55L80 34Q83 25 94 26Q106 31 116 26Q124 25 129 35L135 52Z" fill="#E1AC59"/>
          <Path d="M76 45Q103 50 131 42L134 51Q107 60 74 54Z" fill="#BF644A"/>
          <Path d="M62 55Q76 51 94 52Q126 53 141 47Q151 45 148 51Q144 62 112 65Q84 67 63 61Q56 58 62 55Z" fill="#F1C975"/>
          <Path d="M84 34Q89 29 96 33" fill="none" stroke="#F6D897" strokeWidth={2}/>
        </G>;
}

function MascotFace({kind}:{kind:Companion}) {
  const palette = companions[kind];
  if (kind==='cat') return <G {...outline}>
    <Path d="M61 70Q56 48 62 32Q65 28 86 48Q102 41 122 47Q138 31 143 31Q149 45 145 70Q155 95 142 109Q130 123 100 121Q65 121 58 105Q49 91 61 70Z" fill={palette.fur}/>
    <Path d="M61 69Q58 48 64 34L85 50Q98 44 107 46Q100 58 87 63Q81 67 78 78Q70 86 56 89Q57 77 61 69Z" fill="#39372E" stroke="none"/>
    <Path d="M65 41L77 51L64 59ZM139 40L141 59L129 52Z" fill="#D5AAA0" stroke="none"/>
    <Path d="M81 69L90 72M118 72L126 66" fill="none"/>
    <Ellipse cx={66} cy={99} rx={9} ry={5} fill="#E79783" stroke="none"/><Ellipse cx={141} cy={98} rx={9} ry={5} fill="#E79783" stroke="none"/>
    <Path d="M65 94L52 92M65 101L53 105M143 92L156 89M143 100L155 103" fill="none"/>
    <Path d="M99 91Q104 88 109 91Q109 95 104 97Q100 95 99 91Z" fill={ink}/>
    <Path d="M104 97Q102 107 94 100M104 97Q108 106 115 98" fill="none"/>
  </G>;
  if (kind==='otter') return <G {...outline}>
    <Path d="M60 77Q51 73 54 64Q58 57 67 64Q77 49 104 50Q131 49 141 65Q151 58 155 68Q157 75 148 80Q157 99 145 114Q134 128 104 128Q74 128 62 115Q52 101 60 77Z" fill={palette.fur}/>
    <Path d="M60 96Q68 86 83 91Q90 80 104 80Q120 81 125 91Q140 86 148 97Q150 120 116 125Q79 130 62 112Z" fill={palette.cream} stroke="none"/>
    <Path d="M91 96Q92 84 104 83Q116 84 118 97Q115 102 104 101Q92 102 91 96Z" fill={ink}/>
    <Path d="M105 101L105 108M84 106Q101 119 124 106M69 95L53 92M69 99L51 100M139 93L154 89M140 98L156 97" fill="none"/>
    <TrailHat/>
  </G>;
  if (kind==='beaver') return <G {...outline}>
    <Ellipse cx={69} cy={61} rx={11} ry={10} fill={palette.fur}/><Ellipse cx={138} cy={61} rx={11} ry={10} fill={palette.fur}/>
    <Path d="M65 79Q68 51 102 51Q137 49 143 77Q156 88 151 105Q143 121 108 122Q70 124 59 109Q49 93 65 79Z" fill={palette.fur}/>
    <Path d="M77 92Q87 84 103 91Q119 83 131 93Q143 102 132 111Q119 120 103 113Q85 119 73 110Q65 101 77 92Z" fill={palette.cream} stroke="none"/>
    <Path d="M94 89Q103 85 113 89Q112 96 104 98Q97 96 94 89Z" fill={ink}/>
    <Path d="M95 105L98 115Q103 117 105 114Q110 116 113 113L114 104Z" fill="#FFF8E8"/><Path d="M104 106L105 114M104 98V102Q99 108 92 102M104 102Q110 108 117 101" fill="none" strokeWidth={1.7}/>
    <Path d="M76 98l-14 -3m14 7 -14 3m70 -7 14 -3m-14 7 15 3" fill="none" strokeWidth={1.5}/>
  </G>;
  return <G {...outline}>
        <Path d="M65 67Q55 43 65 38Q77 32 85 53M127 52Q136 32 146 42Q151 50 141 68" fill={palette.fur}/>
        <Path d="M66 55Q60 43 67 43Q73 42 77 51M135 53Q141 41 144 47" fill="#EDAB90" strokeWidth={1.6}/>
        <Path d="M66 79Q64 50 101 48Q139 47 142 77Q154 81 153 95Q152 115 126 117Q101 124 73 116Q53 112 53 98Q52 86 66 79Z" fill={palette.fur}/>
        <Path d="M56 94Q67 85 77 91Q85 96 93 93Q104 86 115 93Q124 98 133 90Q143 86 150 94Q152 112 126 115Q97 123 72 113Q55 109 56 94Z" fill={palette.cream} stroke="none"/>
        <Ellipse cx={66} cy={98} rx={8} ry={4.6} fill="#EC967F" stroke="none"/><Ellipse cx={141} cy={98} rx={8} ry={4.6} fill="#EC967F" stroke="none"/>
        <Path d="M59 94L49 91M59 100L49 101M146 93L157 89M147 99L158 100" fill="none" strokeWidth={2}/>
        <Path d="M73 70Q83 66 97 70Q102 70 100 77L98 86Q96 93 85 92Q76 92 74 85L71 75Q70 71 73 70ZM108 71Q119 67 132 69Q138 70 136 76L133 86Q130 92 119 92Q111 91 109 85L106 76Q105 73 108 71Z" fill="#F8D5A4" strokeWidth={3.3}/>
        <Path d="M99 75Q103 72 107 75M66 73L72 75M136 74L142 72" fill="none"/>
        <Path d="M99 94Q104 91 109 94Q108 99 104 99Q101 98 99 94Z" fill={ink}/>
        <Path d="M104 98L104 101M95 100Q99 107 104 101Q109 106 114 99" fill="none" strokeWidth={2}/>
        <Path d="M101 104L103 108Q106 109 107 104" fill="#FFF9EF" strokeWidth={1.4}/>
    <TrailHat/>
  </G>;
}

function Eyes() {
  return <G fill={ink}><Ellipse cx={88} cy={81} rx={3.2} ry={4.1}/><Ellipse cx={121} cy={81} rx={3.2} ry={4.1}/></G>;
}

export function CompanionPortrait({kind}:{kind:Companion}) {
  return <Svg width={46} height={39} viewBox="44 21 120 112" accessible={false}><MascotFace kind={kind}/><Eyes/></Svg>;
}

type Props = {kind:Companion; idle:Animated.Value; wave:Animated.Value; photo:Animated.Value; hop:Animated.Value};

export default function MascotArt({kind, idle, wave, photo, hop}:Props) {
  const {fur,cream} = companions[kind];
  const breath = idle.interpolate({inputRange:[0,.27,.5,.76,1],outputRange:[0,-1.6,0,-2,0]});
  const blink = idle.interpolate({inputRange:[0,.43,.451,.473,.9,.918,.94,1],outputRange:[1,1,.1,1,1,.1,1,1]});
  const lift = hop.interpolate({inputRange:[0,.18,.44,.57,.81,.9,1],outputRange:[0,3,-14,-15,0,2,0]});
  const squash = hop.interpolate({inputRange:[0,.18,.4,.78,.89,1],outputRange:[1,.95,1.04,1,.96,1]});
  const arm = wave.interpolate({inputRange:[0,.22,.39,.56,.72,1],outputRange:['0deg','-112deg','-89deg','-118deg','-93deg','0deg']});
  const tail = idle.interpolate({inputRange:[0,.4,.78,1],outputRange:['0deg','-3deg','1deg','0deg']});
  const shutter = [0,.28,.44,.67,1];
  const lens = photo.interpolate({inputRange:shutter,outputRange:[0,-61,-58,-58,0]});
  const aim = photo.interpolate({inputRange:shutter,outputRange:[0,-17,-17,-17,0]});
  const raisedPaw = photo.interpolate({inputRange:[0,.19,.3,.72,.93,1],outputRange:[0,0,1,1,0,0]});
  const glint = photo.interpolate({inputRange:[0,.35,.46,.62,1],outputRange:[0,0,1,0,0]});
  return <View pointerEvents="none" accessible={false} style={{width,height}}>
    <Drawing><Ellipse cx={109} cy={165} rx={53} ry={4} fill="#D2C7A7" opacity={.55}/></Drawing>
    <Animated.View testID="squirrel-body" style={[StyleSheet.absoluteFill,{transform:[{translateY:Animated.add(breath,lift)},{scaleY:squash}]}]}>
      <Animated.View style={[StyleSheet.absoluteFill,{transform:[{rotate:tail}]}]}>
        <Drawing><G {...outline}>
          {kind==='cat' ? <>
            <Path d="M129 146Q154 151 160 131C165 116 153 108 156 98Q159 90 165 95C175 108 183 126 172 144Q160 165 131 158Z" fill={fur}/>
            <Path d="M156 104Q153 96 158 93Q165 88 172 109Q167 114 160 112Z" fill="#39372E"/>
          </> : kind==='otter' ?
            <Path d="M127 143Q144 145 157 138Q167 133 178 124Q182 123 180 130C172 147 150 163 128 158Z" fill={fur}/>
          : kind==='beaver'?<><Path d="M123 142Q140 143 159 119C179 97 200 117 188 135Q172 155 132 157Z" fill="#9F745B"/><Path d="M148 145l21-28m-10 31 21-28m-18 4 16 10m-23-1 15 9" fill="none" stroke="#78533F" strokeWidth={1.6}/></>
          : <><Path d="M123 138C151 146 154 126 151 115C145 91 160 80 174 84C190 88 193 107 186 122C181 134 167 153 145 155Q127 158 120 149Z" fill={fur}/>
          <Path d="M145 147C166 143 179 121 178 108C177 98 164 96 163 106Q162 112 168 112" fill="none" stroke="#986444"/></>}
        </G></Drawing>
      </Animated.View>
      <View style={StyleSheet.absoluteFill}><Drawing><G {...outline}>
        {kind!=='beaver' && <>
        {kind==='otter' && <G><Path d="M78 113L71 69Q69 63 64 66L61 68L65 116ZM65 114L58 80Q55 74 50 78L47 82L52 119Z" fill="#AE997C"/></G>}
        <Path d="M70 102Q54 96 51 114L47 144Q47 152 59 153L83 153L87 110Z" fill={kind==='otter'?'#629B91':'#AD7244'}/>
        <Path d="M50 125L66 127L63 144Q54 148 48 142Z" fill="#DFA455"/>
        <Path d="M62 101L49 94Q43 91 42 96L38 103Q38 107 43 109L65 119" fill="#71937B"/>
        <Ellipse cx={44} cy={101} rx={6} ry={9} rotation={25} origin="44,101" fill="#A9B69A"/>
        <Path d="M41 104Q40 95 46 98Q49 101 44 104" fill="none" strokeWidth={1.5}/></>}
        <Path d="M71 103Q80 93 103 98Q129 95 140 116Q146 131 138 149L141 156Q147 166 128 165Q119 166 118 156Q106 160 91 155Q91 165 78 165Q65 165 70 155L74 146Q65 130 71 103Z" fill={fur}/>
        <Path d="M86 145Q83 120 101 118Q121 115 126 147Q111 155 90 150Z" fill={cream} stroke="none"/>
        {kind!=='beaver' && <Path d="M75 107Q70 119 76 129M131 108L134 119" fill="none" stroke="#845736" strokeWidth={5}/>}
        <Path d="M77 109Q81 133 99 142Q121 133 129 108" fill="none" strokeWidth={2}/>
      </G></Drawing></View>
      <View testID="mascot-face" style={StyleSheet.absoluteFill}><Drawing><MascotFace kind={kind}/></Drawing></View>
      <Animated.View style={{position:'absolute',left:82,top:74,width:45,height:13,transform:[{scaleY:blink}]}}>
        <Svg width={45} height={13} viewBox="82 74 45 13" accessible={false}><Eyes/></Svg>
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill,{transform:[{translateX:24},{translateY:28},{rotate:arm},{translateY:-28},{translateX:-24}]}]}>
        <Drawing><Path {...outline} d="M133 115Q142 116 149 129Q152 136 147 138Q140 141 134 132L129 124" fill={fur}/></Drawing>
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill,{opacity:raisedPaw}]}><Drawing>
        <Path {...outline} d="M76 128Q68 132 65 121Q60 106 65 83Q67 76 72 77Q77 78 75 86Q72 104 81 117" fill={fur}/>
      </Drawing></Animated.View>
      <Animated.View testID="squirrel-camera" style={[StyleSheet.absoluteFill,{transform:[{translateX:aim},{translateY:lens}]}]}>
        <Drawing><G {...outline}>
          <Path d="M85 131L90 130L92 125L104 125L108 130L121 130Q125 130 125 134L124 147Q124 150 120 150L88 150Q83 150 83 146L83 135Q83 132 85 131Z" fill="#627971"/>
          <Circle cx={105} cy={139} r={7.5} fill="#F0D9A9"/><Circle cx={105} cy={139} r={4} fill="#537072" strokeWidth={1.5}/>
          <Rect x={114} y={133} width={6} height={3} rx={1} fill="#F4D794" stroke="none"/>
          <Path d="M76 124Q78 119 83 122L92 129Q96 135 89 138Q83 140 77 135" fill={fur}/>
        </G></Drawing>
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill,{opacity:glint}]}><Drawing>
        <Path d="M108 73L111 65M113 77L120 73M114 82L121 83" {...outline} stroke="#A46035"/>
      </Drawing></Animated.View>
    </Animated.View>
  </View>;
}
