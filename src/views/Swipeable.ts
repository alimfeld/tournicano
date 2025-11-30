import m from "mithril";

export interface SwipeableAttrs {
  element: string;
  onswipeleft: (() => void) | undefined;
  onswiperight: (() => void) | undefined;
  onanimationstart?: () => void; // Called when animation starts (for header updates)
}

const ID = crypto.randomUUID();
const GESTURE_THRESHOLD = 20;
const SWIPE_THRESHOLD = Math.min(100, window.innerWidth * 0.25); // 25% of screen width, max 100px
const SLIDE_IN_DURATION = 0.4; // Animation duration in seconds

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
            
            // Calculate opacity based on swipe progress (fade out as approaching threshold)
            // Keep minimum opacity at 0.2 so content stays slightly visible
            const opacity = Math.max(0.2, 1 - (dx / SWIPE_THRESHOLD));
            
            document.getElementById(ID)!.style =
              tx !== 0
                ? `transform: translateX(${tx}px); opacity: ${opacity}`
                : "";
            event.preventDefault();
          }
        },
        ontouchend: (event: TouchEvent) => {
          if (!isSwiping) {
            return;
          }
          isSwiping = false;
          const touchEndX = event.changedTouches[0].screenX;
          const swipeableElement = document.getElementById(ID)!;
          
          if (
            touchEndX - touchStartX > SWIPE_THRESHOLD &&
            vnode.attrs.onswipeleft
          ) {
            // Swiping right -> change content and slide in from left
            const callback = vnode.attrs.onswipeleft;
            
            // Change content immediately
            callback();
            
            // Force Mithril to redraw synchronously, then animate
            m.redraw();
            
            // Wait for DOM to be ready and set initial styles
            requestAnimationFrame(() => {
              const newElement = document.getElementById(ID);
              if (!newElement) return;
              
              newElement.style.transition = "none";
              newElement.style.transform = "translateX(-100%)";
              newElement.style.opacity = "0.2";
              
              // Start transition in next frame
              requestAnimationFrame(() => {
                newElement.style.transition = `transform ${SLIDE_IN_DURATION}s ease-in-out, opacity ${SLIDE_IN_DURATION}s ease-in-out`;
                newElement.style.transform = "translateX(0)";
                newElement.style.opacity = "1";
              });
            });
          } else if (
            touchEndX - touchStartX < -SWIPE_THRESHOLD &&
            vnode.attrs.onswiperight
          ) {
            // Swiping left -> change content and slide in from right
            const callback = vnode.attrs.onswiperight;
            
            // Change content immediately
            callback();
            
            // Force Mithril to redraw synchronously, then animate
            m.redraw();
            
            // Wait for DOM to be ready and set initial styles
            requestAnimationFrame(() => {
              const newElement = document.getElementById(ID);
              if (!newElement) return;
              
              newElement.style.transition = "none";
              newElement.style.transform = "translateX(100%)";
              newElement.style.opacity = "0.2";
              
              // Start transition in next frame
              requestAnimationFrame(() => {
                newElement.style.transition = `transform ${SLIDE_IN_DURATION}s ease-in-out, opacity ${SLIDE_IN_DURATION}s ease-in-out`;
                newElement.style.transform = "translateX(0)";
                newElement.style.opacity = "1";
              });
            });
          } else {
            // Swipe didn't meet threshold, animate back to original position
            swipeableElement.style.transition = "transform 0.3s ease-out, opacity 0.3s ease-out";
            swipeableElement.style.transform = "translateX(0)";
            swipeableElement.style.opacity = "1";
            
            // Clear the transition after animation completes
            setTimeout(() => {
              swipeableElement.style.transition = "";
            }, 300);
          }
        },
      },
      vnode.children,
    );
  },
};
