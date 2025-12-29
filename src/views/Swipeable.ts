import m from "mithril";
import "./Swipeable.css";

export interface SwipeableAttrs {
  element: string;
  onswipeleft: (() => void) | undefined;
  onswiperight: (() => void) | undefined;
  showNavHints?: boolean; // Show clickable navigation chevrons
}

interface SwipeableState {
  touchStartX: number;
  touchStartY: number;
  isSwiping: boolean;
  id: string;
}

const GESTURE_THRESHOLD = 20;
const SWIPE_THRESHOLD = Math.min(100, window.innerWidth * 0.25); // 25% of screen width, max 100px
const SLIDE_IN_DURATION = 0.4; // Animation duration in seconds

export const Swipeable: m.Component<SwipeableAttrs, SwipeableState> = {
  oninit: (vnode) => {
    vnode.state.touchStartX = 0;
    vnode.state.touchStartY = 0;
    vnode.state.isSwiping = false;
    vnode.state.id = crypto.randomUUID();
  },
  
  view: (vnode) => {
    const { element, onswipeleft, onswiperight, showNavHints } = vnode.attrs;
    const state = vnode.state;
    
    // Function to trigger navigation with animation
    const triggerNavigation = (callback: () => void, direction: 'left' | 'right') => {
      const swipeableElement = document.getElementById(state.id);
      if (!swipeableElement) return;
      
      // Change content immediately
      callback();
      
      // Force Mithril to redraw synchronously, then animate
      m.redraw();
      
      // Wait for DOM to be ready and set initial styles
      requestAnimationFrame(() => {
        const newElement = document.getElementById(state.id);
        if (!newElement) return;
        
        newElement.style.transition = "none";
        newElement.style.transform = direction === 'left' ? "translateX(100%)" : "translateX(-100%)";
        newElement.style.opacity = "0.2";
        
        // Start transition in next frame
        requestAnimationFrame(() => {
          newElement.style.transition = `transform ${SLIDE_IN_DURATION}s ease-in-out, opacity ${SLIDE_IN_DURATION}s ease-in-out`;
          newElement.style.transform = "translateX(0)";
          newElement.style.opacity = "1";
          
          // Clean up inline styles after animation completes
          setTimeout(() => {
            newElement.style.transition = "";
            newElement.style.transform = "";
            newElement.style.opacity = "";
          }, SLIDE_IN_DURATION * 1000);
        });
      });
    };
    
    return m.fragment({}, [
      m(
        element + ".swipeable-container",
        {
          id: state.id,
          ontouchstart: (event: TouchEvent) => {
            state.touchStartX = event.changedTouches[0].screenX;
            state.touchStartY = event.changedTouches[0].screenY;
          },
          ontouchmove: (event: TouchEvent) => {
            if (!event.cancelable) {
              // browser is doing its thing (e.g. scrolling)
              return;
            }
            const touchEndX = event.changedTouches[0].screenX;
            const touchEndY = event.changedTouches[0].screenY;
            const dx = Math.abs(touchEndX - state.touchStartX);
            const dy = Math.abs(touchEndY - state.touchStartY);
            
            // Detect if horizontal swipe (not vertical scroll)
            if (!state.isSwiping && dx > GESTURE_THRESHOLD && dx > dy) {
              // gesture recognized
              state.isSwiping = true;
              m.redraw();
            }
            if (state.isSwiping) {
              let tx = 0;
              if (touchEndX > state.touchStartX) {
                // right
                tx = onswipeleft ? dx : 0;
              } else {
                // left
                tx = onswiperight ? -dx : 0;
              }
              
              // Calculate opacity based on swipe progress (fade out as approaching threshold)
              // Keep minimum opacity at 0.2 so content stays slightly visible
              const opacity = Math.max(0.2, 1 - (dx / SWIPE_THRESHOLD));
              
              document.getElementById(state.id)!.style =
                tx !== 0
                  ? `transform: translateX(${tx}px); opacity: ${opacity}`
                  : "";
              event.preventDefault();
            }
          },
          ontouchend: (event: TouchEvent) => {
            if (!state.isSwiping) {
              return;
            }
            state.isSwiping = false;
            const touchEndX = event.changedTouches[0].screenX;
            const swipeableElement = document.getElementById(state.id)!;
            
            if (
              touchEndX - state.touchStartX > SWIPE_THRESHOLD &&
              onswipeleft
            ) {
              // Swiping right -> change content and slide in from left
              triggerNavigation(onswipeleft, 'right');
            } else if (
              touchEndX - state.touchStartX < -SWIPE_THRESHOLD &&
              onswiperight
            ) {
              // Swiping left -> change content and slide in from right
              triggerNavigation(onswiperight, 'left');
            } else {
              // Swipe didn't meet threshold, animate back to original position
              swipeableElement.style.transition = "transform 0.3s ease-out, opacity 0.3s ease-out";
              swipeableElement.style.transform = "translateX(0)";
              swipeableElement.style.opacity = "1";
              
              // Clear all inline styles after animation completes
              setTimeout(() => {
                swipeableElement.style.transition = "";
                swipeableElement.style.transform = "";
                swipeableElement.style.opacity = "";
              }, 300);
            }
            m.redraw();
          },
        },
        vnode.children
      ),
      // Render navigation hints outside the swipeable container to avoid transform issues
      showNavHints ? [
        m("button.swipeable-nav-hint.left", {
          key: "nav-left",
          class: (state.isSwiping || !onswipeleft) ? "hidden" : "",
          tabindex: -1, // Prevent focus
          onmousedown: (e: MouseEvent) => {
            if (!onswipeleft) return;
            e.preventDefault(); // Prevent focus on click
            triggerNavigation(onswipeleft, 'right');
          },
          "aria-label": "Previous"
        }, "‹"),
        m("button.swipeable-nav-hint.right", {
          key: "nav-right",
          class: (state.isSwiping || !onswiperight) ? "hidden" : "",
          tabindex: -1, // Prevent focus
          onmousedown: (e: MouseEvent) => {
            if (!onswiperight) return;
            e.preventDefault(); // Prevent focus on click
            triggerNavigation(onswiperight, 'left');
          },
          "aria-label": "Next"
        }, "›"),
      ] : null
    ]);
  },
};
