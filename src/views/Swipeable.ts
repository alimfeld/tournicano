import m from "mithril";

export interface SwipeableAttrs {
  element: string;
  onswiping: (swiping: boolean) => void;
  onswipeleft: (() => void) | undefined;
  onswiperight: (() => void) | undefined;
}

const ID = crypto.randomUUID();
const GESTURE_THRESHOLD = 20;
const SWIPE_THRESHOLD = 80;

let touchStartX = 0;
let isSwiping = false;

export const Swipeable: m.Component<SwipeableAttrs> = {
  view: (vnode) => {
    return m(
      vnode.attrs.element,
      {
        id: ID,
        ontouchstart: (event: TouchEvent) => {
          touchStartX = event.changedTouches[0].screenX;
        },
        ontouchmove: (event: TouchEvent) => {
          if (!event.cancelable) {
            // browser is doing its thing (e.g. scrolling)
            return;
          }
          const touchEndX = event.changedTouches[0].screenX;
          const dx = Math.abs(touchEndX - touchStartX);
          if (!isSwiping && dx > GESTURE_THRESHOLD) {
            // gesture recognized
            isSwiping = true;
            vnode.attrs.onswiping(true);
          }
          if (isSwiping) {
            let tx = 0;
            if (touchEndX > touchStartX) {
              // right
              tx = vnode.attrs.onswipeleft ? dx : 0;
            } else {
              // left
              tx = vnode.attrs.onswiperight ? -dx : 0;
            }
            const opacity = Math.max(
              0.1,
              1 - Math.min(dx, SWIPE_THRESHOLD) / SWIPE_THRESHOLD,
            );
            document.getElementById(ID)!.style =
              `transform: translateX(${tx}px); opacity: ${tx != 0 ? opacity : 1}`;
            event.preventDefault();
          }
        },
        ontouchend: (event: TouchEvent) => {
          if (!isSwiping) {
            return;
          }
          isSwiping = false;
          vnode.attrs.onswiping(false);
          document.getElementById(ID)!.style =
            "transform: translateX(0); opacity: 1";
          const touchEndX = event.changedTouches[0].screenX;
          if (
            touchEndX - touchStartX > SWIPE_THRESHOLD &&
            vnode.attrs.onswipeleft
          ) {
            vnode.attrs.onswipeleft();
          }
          if (
            touchEndX - touchStartX < -SWIPE_THRESHOLD &&
            vnode.attrs.onswiperight
          ) {
            vnode.attrs.onswiperight();
          }
        },
      },
      vnode.children,
    );
  },
};
