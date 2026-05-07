export type SwipeDirection = 'align' | 'oppose';

export function swipeDelta(direction: SwipeDirection): 5 | -5 {
  return direction === 'align' ? 5 : -5;
}
