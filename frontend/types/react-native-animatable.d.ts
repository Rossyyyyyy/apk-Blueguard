declare module 'react-native-animatable' {
  import { Component } from 'react';
  import { ViewProps, TextProps, ImageProps } from 'react-native';

  export type Animation =
    | 'bounce'
    | 'flash'
    | 'jello'
    | 'pulse'
    | 'rotate'
    | 'rubberBand'
    | 'shake'
    | 'swing'
    | 'tada'
    | 'wobble'
    | 'bounceIn'
    | 'bounceInDown'
    | 'bounceInUp'
    | 'bounceInLeft'
    | 'bounceInRight'
    | 'bounceOut'
    | 'bounceOutDown'
    | 'bounceOutUp'
    | 'bounceOutLeft'
    | 'bounceOutRight'
    | 'fadeIn'
    | 'fadeInDown'
    | 'fadeInDownBig'
    | 'fadeInUp'
    | 'fadeInUpBig'
    | 'fadeInLeft'
    | 'fadeInLeftBig'
    | 'fadeInRight'
    | 'fadeInRightBig'
    | 'fadeOut'
    | 'fadeOutDown'
    | 'fadeOutDownBig'
    | 'fadeOutUp'
    | 'fadeOutUpBig'
    | 'fadeOutLeft'
    | 'fadeOutLeftBig'
    | 'fadeOutRight'
    | 'fadeOutRightBig'
    | 'flipInX'
    | 'flipInY'
    | 'flipOutX'
    | 'flipOutY'
    | 'lightSpeedIn'
    | 'lightSpeedOut'
    | 'slideInDown'
    | 'slideInUp'
    | 'slideInLeft'
    | 'slideInRight'
    | 'slideOutDown'
    | 'slideOutUp'
    | 'slideOutLeft'
    | 'slideOutRight'
    | 'zoomIn'
    | 'zoomInDown'
    | 'zoomInUp'
    | 'zoomInLeft'
    | 'zoomInRight'
    | 'zoomOut'
    | 'zoomOutDown'
    | 'zoomOutUp'
    | 'zoomOutLeft'
    | 'zoomOutRight';

  export type Easing =
    | 'linear'
    | 'ease'
    | 'ease-in'
    | 'ease-out'
    | 'ease-in-out'
    | 'ease-in-cubic'
    | 'ease-out-cubic'
    | 'ease-in-out-cubic'
    | 'ease-in-circ'
    | 'ease-out-circ'
    | 'ease-in-out-circ'
    | 'ease-in-expo'
    | 'ease-out-expo'
    | 'ease-in-out-expo'
    | 'ease-in-quad'
    | 'ease-out-quad'
    | 'ease-in-out-quad'
    | 'ease-in-quart'
    | 'ease-out-quart'
    | 'ease-in-out-quart'
    | 'ease-in-quint'
    | 'ease-out-quint'
    | 'ease-in-out-quint'
    | 'ease-in-sine'
    | 'ease-out-sine'
    | 'ease-in-out-sine'
    | 'ease-in-back'
    | 'ease-out-back'
    | 'ease-in-out-back';

  export type Direction = 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';

  export interface AnimatableProperties {
    animation?: Animation | string;
    duration?: number;
    delay?: number;
    direction?: Direction;
    easing?: Easing | string;
    iterationCount?: number | 'infinite';
    transition?: string | string[];
    onAnimationBegin?: () => void;
    onAnimationEnd?: () => void;
    onTransitionBegin?: (property: string) => void;
    onTransitionEnd?: (property: string) => void;
    useNativeDriver?: boolean;
    isInteraction?: boolean;
  }

  export class View extends Component<ViewProps & AnimatableProperties> {
    fadeIn(duration?: number): Promise<void>;
    fadeOut(duration?: number): Promise<void>;
    fadeInUp(duration?: number): Promise<void>;
    fadeInDown(duration?: number): Promise<void>;
    fadeInLeft(duration?: number): Promise<void>;
    fadeInRight(duration?: number): Promise<void>;
    fadeOutUp(duration?: number): Promise<void>;
    fadeOutDown(duration?: number): Promise<void>;
    fadeOutLeft(duration?: number): Promise<void>;
    fadeOutRight(duration?: number): Promise<void>;
    slideInUp(duration?: number): Promise<void>;
    slideInDown(duration?: number): Promise<void>;
    slideInLeft(duration?: number): Promise<void>;
    slideInRight(duration?: number): Promise<void>;
    slideOutUp(duration?: number): Promise<void>;
    slideOutDown(duration?: number): Promise<void>;
    slideOutLeft(duration?: number): Promise<void>;
    slideOutRight(duration?: number): Promise<void>;
    zoomIn(duration?: number): Promise<void>;
    zoomOut(duration?: number): Promise<void>;
    bounce(duration?: number): Promise<void>;
    flash(duration?: number): Promise<void>;
    jello(duration?: number): Promise<void>;
    pulse(duration?: number): Promise<void>;
    rotate(duration?: number): Promise<void>;
    shake(duration?: number): Promise<void>;
    swing(duration?: number): Promise<void>;
    tada(duration?: number): Promise<void>;
    wobble(duration?: number): Promise<void>;
    bounceIn(duration?: number): Promise<void>;
    bounceOut(duration?: number): Promise<void>;
    flipInX(duration?: number): Promise<void>;
    flipInY(duration?: number): Promise<void>;
    flipOutX(duration?: number): Promise<void>;
    flipOutY(duration?: number): Promise<void>;
    lightSpeedIn(duration?: number): Promise<void>;
    lightSpeedOut(duration?: number): Promise<void>;
    rubberBand(duration?: number): Promise<void>;
    animate(animation: Animation | string, duration?: number): Promise<void>;
    stopAnimation(): void;
    transition(fromValues: any, toValues: any, duration?: number): Promise<void>;
    transitionTo(toValues: any, duration?: number, easing?: Easing): Promise<void>;
  }

  export class Text extends Component<TextProps & AnimatableProperties> {
    fadeIn(duration?: number): Promise<void>;
    fadeOut(duration?: number): Promise<void>;
    animate(animation: Animation | string, duration?: number): Promise<void>;
    stopAnimation(): void;
  }

  export class Image extends Component<ImageProps & AnimatableProperties> {
    fadeIn(duration?: number): Promise<void>;
    fadeOut(duration?: number): Promise<void>;
    animate(animation: Animation | string, duration?: number): Promise<void>;
    stopAnimation(): void;
  }

  export function createAnimatableComponent<P>(component: React.ComponentType<P>): React.ComponentType<P & AnimatableProperties>;

  export function initializeRegistryWithDefinitions(definitions: any): void;
  export function getAnimationByName(name: string): any;
  export function makeAnimation(name: string, obj: any): any;
}