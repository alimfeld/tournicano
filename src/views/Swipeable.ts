import m from "mithril";

export interface SwipeableAttrs {
  element: string;
  onswipeleft: () => void;
  onswiperight: () => void;
}

const ID = crypto.randomUUID();
const SWIPE_THRESHOLD = 50;
const GESTURE_THRESHOLD = 20;
let touchStartX = 0;
let touchStartY = 0;
let isSwiping = false;

export const Swipeable: m.Component<SwipeableAttrs> = {
  view: (vnode) => {
    return m(
      vnode.attrs.element,
      {
        id: ID,
        ontouchstart: (event: TouchEvent) => {
          touchStartX = event.changedTouches[0].screenX;
          touchStartY = event.changedTouches[0].screenY;
        },
        ontouchmove: (event: TouchEvent) => {
          if (!event.cancelable) {
            return;
          }
          const touchEndX = event.changedTouches[0].screenX;
          if (
            !isSwiping &&
            Math.abs(touchEndX - touchStartX) > GESTURE_THRESHOLD
          ) {
            isSwiping = true;
          }
          if (isSwiping) {
            document.getElementById(ID)!.style =
              `transform: translateX(${touchEndX - touchStartX}px)`;
            event.preventDefault();
          }
        },
        ontouchend: (event: TouchEvent) => {
          if (!isSwiping) {
            return;
          }
          isSwiping = false;
          document.getElementById(ID)!.style = "transform: translateX(0)";
          const touchEndX = event.changedTouches[0].screenX;
          if (touchEndX - touchStartX > SWIPE_THRESHOLD) {
            vnode.attrs.onswipeleft();
          }
          if (touchEndX - touchStartX < -SWIPE_THRESHOLD) {
            vnode.attrs.onswiperight();
          }
        },
      },
      vnode.children,
    );
  },
};
