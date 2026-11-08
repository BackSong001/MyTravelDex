import React from 'react';
import {View} from 'react-native';
import Svg, {Path} from 'react-native-svg';
import {colors as c} from './design/colors.json';

export type OrnamentKind = 'wave' | 'cloud' | 'plane' | 'boat';
export const oceanOrnaments: {id: string; kind: OrnamentKind; coordinate: [number, number]}[] = [
 {id: 'west-wave', kind: 'wave', coordinate: [124.9, 36.8]},
 {id: 'west-boat', kind: 'boat', coordinate: [125.8, 35.1]},
 {id: 'west-cloud', kind: 'cloud', coordinate: [125.8, 36.3]},
 {id: 'south-wave', kind: 'wave', coordinate: [127.2, 33.8]},
 {id: 'south-plane', kind: 'plane', coordinate: [127.9, 33.9]},
 {id: 'east-wave', kind: 'wave', coordinate: [130.2, 36.8]},
 {id: 'east-boat', kind: 'boat', coordinate: [130.4, 35.5]},
];

const paths: Record<OrnamentKind, {d: string; fill: string; stroke: string}[]> = {
 wave: [
  {d: 'M3 4 Q8 0 13 4 T23 4 T33 4 T43 4 M8 12 Q13 8 18 12 T28 12 T38 12 T48 12', fill: 'none', stroke: c.map.waterDecoration},
 ],
 cloud: [
  {d: 'M10 30 C2 30 2 20 9 19 C7 9 20 6 25 15 C32 9 40 15 37 22 C45 24 40 31 34 30 Z', fill: c.surface, stroke: c.map.oceanHighlight},
 ],
 plane: [
  {d: 'M7 32 L17 23 L5 17 L8 13 L24 17 L34 7 Q39 3 40 8 L30 23 L34 36 L30 39 L24 29 L16 34 L13 40 L9 39 L10 34 Z', fill: c.map.visitedRegionBorder, stroke: c.map.regionBorderSelected},
  {d: 'M17 30 L31 16', fill: 'none', stroke: c.map.oceanHighlight},
 ],
 boat: [
  {d: 'M8 29 L36 29 L31 36 L14 36 Z', fill: c.map.visitedRegionBorder, stroke: c.map.regionBorderSelected},
  {d: 'M23 7 L23 26 L9 26 Z M26 13 L34 26 L26 26 Z', fill: c.surfaceWarm, stroke: c.map.waterDecoration},
  {d: 'M23 6 L23 29 M5 40 Q9 37 13 40 T21 40 T29 40 T37 40', fill: 'none', stroke: c.map.waterDecoration},
 ],
};

export function ornamentMarkup(kind: OrnamentKind, zoom = 0): string {
 if (zoom >= 9) return '';
 const width = kind === 'wave' ? 50 : 44, height = kind === 'wave' ? 15 : 44;
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" aria-hidden="true" focusable="false" pointer-events="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${paths[kind].map(({d, fill, stroke}) => `<path d="${d}" fill="${fill}" stroke="${stroke}"/>`).join('')}</svg>`;
}

export default function MapOrnament({kind, zoom = 0}: {kind: OrnamentKind; zoom?: number}) {
 if (zoom >= 9) return null;
 const width = kind === 'wave' ? 50 : 44, height = kind === 'wave' ? 15 : 44;
 return <View collapsable={false} pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{width, height}}>
  <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} pointerEvents="none" accessible={false} aria-hidden={true} focusable={false} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
   {paths[kind].map((path, index) => <Path key={index} {...path}/>)}
  </Svg>
 </View>;
}
