import React from 'react';
// Native 모듈/렌더러 생성 실패도 기존 지도 상태를 소유한 부모에서 SVG로 복구한다.
export default class TileBoundary extends React.Component<{children:React.ReactNode;onFailure:()=>void},{failed:boolean}>{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 componentDidCatch(){this.props.onFailure();}
 render(){return this.state.failed?null:this.props.children;}
}
