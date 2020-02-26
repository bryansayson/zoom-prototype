/**
 * This example borrows heavily from the algorithms prescribed by MDN in this article:
 * https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events/Pinch_zoom_gestures
 * and this github gist
 * https://gist.github.com/iammerrick/c4bbac856222d65d3a11dad1c42bdcca
 */
/**
 * TODOs
 * ~~~ 1. Stop using async events, and rely on synthetic events instead
 * 2. Handle aspect ratio zooming in and out
 * 3. Request animation frame any time you zoom in and out
 * 4. Maybe introduce CSS animation for zoom behavior to make things feel smoother
 * 5. Start zooming the original image, replacing it with the higher res image once zoom has finished
 *
 *
 * Types of movement that someone can do:
 * - Tap
 * - Pinch - in/out
 * - Pan (can also occur while pinching) -
 *
 *
 * State:
 * - x/y offset of image zoomed
 * - zoom factor
 *
 * Assumptions:
 * - Image is always going to be square
 * - Hovered image is always going to be the same aspect ratio as the original
 */

/**
 * 1 - 3
 * 1 - 600px
 * 2 - 1100 (1600-600) / 2 = 500px growth from 600
 * 3 - 1600px (1600-600) / 2 = 500px growth from 1100
 *
 */

import React, { Component } from "react";
import "./PinchToZoom.css";

// We always will assume that our images are square (since our image cruncher will have some problems with aspect ratio if we don't)
const images = {
  600: "https://secure.img1-fg.wfcdn.com/im/95036494/resize-h600-w600%5Ecompr-r85/1040/104018557/Vart+Geunuine+Leather+Swivel+34%2522+Lounge+Chair+and+Ottoman.jpg",
  1600: "https://secure.img1-fg.wfcdn.com/im/90094606/resize-h1600-w1600%5Ecompr-r85/1040/104018557/Vart+Geunuine+Leather+Swivel+34%2522+Lounge+Chair+and+Ottoman.jpg"
};

const MIN_ZOOM_FACTOR = 1;
// TODO move this inside state and derive from current zoomed image
const MAX_ZOOM_FACTOR = 2.666;
const MAX_DELTA = MAX_ZOOM_FACTOR - MIN_ZOOM_FACTOR;
// we use this to multiply zoom gestures
const ZOOM_ASSIST_FACTOR = 0.5;

const getMidpoint = (pointerA, pointerB) => ({
  x: (pointerA.x + pointerB.x) / 2,
  y: (pointerA.y + pointerB.y) / 2
});

class PinchToZoom extends Component {
  state = {
    touchAction: "none",
    position: {
      top: 0,
      left: 0
    },
    zoomFactor: MIN_ZOOM_FACTOR,
    maxZoomWidthBound: 0,
    maxZoomHeightBound: 0,
    zoomImageBoundingClientRect: 0,
    currentZoomedImageWidth: 0,
    currentZoomedImageHeight: 0,
    previousDistanceBetweenPointers: 0
  };
  containerRef = null;
  zoomImageRef = null;
  containerDimensions = {};
  zoomImageDimensions = {};
  activePointers = [];

  setZoomImageBoundingClientRect = () => {
    this.zoomImageDimensions = this.zoomImageRef.getBoundingClientRect();
    this.setState({
      zoomImageBoundingClientRect: this.zoomImageDimensions
    });
  };

  assignRef = ref => {
    this.containerRef = ref;
    this.containerDimensions = this.containerRef.getBoundingClientRect();
  };

  assignZoomImageRef = ref => {
    this.zoomImageRef = ref;
    this.setZoomImageBoundingClientRect();
  };

  getIndexOfEvent = event => {
    return this.activePointers.findIndex(
      cachedEvent => cachedEvent.pointerId === event.pointerId
    );
  };

  getPointFromTouch = touch => {
    const rect = this.containerRef.getBoundingClientRect();
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };
  };

  storeEvent = event => {
    this.activePointers.push({
      current: event,
      previous: null,
      pointerId: event.pointerId
    });
  };

  updateEventIfItExists = event => {
    const indexForThisPointer = this.getIndexOfEvent(event);
    if (indexForThisPointer >= 0) {
      this.activePointers[indexForThisPointer] = {
        current: event,
        pointerId: event.pointerId,
        previous: this.activePointers[indexForThisPointer].current
      };
    }
  };

  calculateZoomFactorChange = () => {
    const currentDistanceX = Math.abs(
      this.activePointers[0].current.clientX -
        this.activePointers[1].current.clientX
    );
    const currentDistanceY = Math.abs(
      this.activePointers[0].current.clientY -
        this.activePointers[1].current.clientY
    );
    const currentDistance = Math.sqrt(
      Math.pow(currentDistanceX, 2) + Math.pow(currentDistanceY, 2)
    );
    let zoomChange = 0;

    // previousDistanceBetweenPointers starts at 0 and we only want to do the calculation if it has been set to something other than 0
    if (this.state.previousDistanceBetweenPointers) {
      // check delta change to be a ceratin amount before doing calculation
      const delta =
        currentDistance - this.state.previousDistanceBetweenPointers;
      const zoomRatio =
        (delta / this.containerDimensions.width) * ZOOM_ASSIST_FACTOR;

      zoomChange = MAX_DELTA * zoomRatio;
      return zoomChange;
    }

    this.setState({ previousDistanceBetweenPointers: currentDistance });
  };

  handlePointerUp = event => {
    if (event.pointerType === "touch") {
      this.activePointers.splice(this.getIndexOfEvent(event), 1);
      if (this.activePointers.length < 2) {
        this.setState({ previousDistanceBetweenPointers: 0 });
      }
    }
  };

  handlePointerDown = event => {
    event.persist();

    if (event.pointerType === "mouse" || event.pointerType === "pen") {
      if (!this.activePointers.length) {
        this.storeEvent(event);
        const mouseClickPoint = this.getPointFromTouch(
          this.activePointers[0].current
        );
        this.handleZoomPan({
          pointerLocation: mouseClickPoint,
          zoomChangeFactor: MAX_ZOOM_FACTOR
        });
      } else {
        this.activePointers = [];
        this.setState({ zoomFactor: MIN_ZOOM_FACTOR });
      }
    }
    if (event.pointerType === "touch") {
      this.storeEvent(event);
    }
  };

  handlePointerMove = event => {
    event.persist();
    this.updateEventIfItExists(event);

    if (event.pointerType === "mouse" || event.pointerType === "pen") {
      if (this.activePointers.length) {
        const pointerLocation = this.getPointFromTouch(
          this.activePointers[0].current
        );
        this.handleZoomPan({ pointerLocation });
      }
    }

    if (event.pointerType === "touch") {
      const pointerLocation = this.getPointFromTouch(
        this.activePointers[0].current
      );
      const previousPointerLocation = this.getPointFromTouch(
        this.activePointers[0].previous
      );
      if (this.activePointers.length === 1) {
        this.handleZoomPan({
          method: "drag",
          pointerLocation,
          previousPointerLocation
        });
      }

      if (this.activePointers.length > 1) {
        this.handleZoomPan({
          zoomChangeFactor: this.calculateZoomFactorChange(),
          method: "drag",
          pointerLocation,
          previousPointerLocation
        });
      }
    }
  };

  handleZoomPan = ({
    pointerLocation,
    zoomChangeFactor = 0,
    method = "pan",
    previousPointerLocation
  }) => {
    // Zooming Midpoint should be optional. we only provide it on mouse events
    // (since mouse events toggle zoom on and off) and the first time we zoom
    // into an image, when a new zooming point has been introduced

    // Don't touch these! these variables are the same with or without
    // the pointerLocation
    const zoomFactor = Math.max(
      Math.min(this.state.zoomFactor + zoomChangeFactor, MAX_ZOOM_FACTOR),
      MIN_ZOOM_FACTOR
    );
    const currentZoomedImageWidth = this.containerDimensions.width * zoomFactor;
    const currentZoomedImageHeight =
      this.containerDimensions.height * zoomFactor;
    const imageSizeRatioWidth =
      currentZoomedImageWidth / this.containerDimensions.width;
    const imageSizeRatioHeight =
      currentZoomedImageHeight / this.containerDimensions.height;
    const maxZoomWidthBound =
      this.containerDimensions.width - currentZoomedImageWidth;
    const maxZoomHeightBound =
      this.containerDimensions.height - currentZoomedImageHeight;
    // Don't touch these! these variables are the same with or without
    // the pointerLocation

    const leftTouchPosition = pointerLocation.x - this.containerDimensions.left;
    const topTouchPosition = pointerLocation.y - this.containerDimensions.top;

    let imageOffsetLeft =
      -(leftTouchPosition * imageSizeRatioWidth) +
      this.containerDimensions.width / 2;
    let imageOffsetTop =
      -(topTouchPosition * imageSizeRatioHeight) +
      this.containerDimensions.height / 2;

    if (method === "drag" && previousPointerLocation) {
      console.log("happening");
      imageOffsetLeft =
        this.state.position.left +
        (pointerLocation.x - previousPointerLocation.x) * imageSizeRatioWidth;
      imageOffsetTop =
        this.state.position.top +
        (pointerLocation.y - previousPointerLocation.y) * imageSizeRatioHeight;
    }

    this.setState({
      zoomFactor,
      position: {
        left: Math.min(0, Math.max(imageOffsetLeft, maxZoomWidthBound)),
        top: Math.min(0, Math.max(imageOffsetTop, maxZoomHeightBound))
      },
      maxZoomWidthBound,
      maxZoomHeightBound,
      currentZoomedImageWidth,
      currentZoomedImageHeight
    });
  };

  componentDidMount() {
    this.setZoomImageBoundingClientRect();
    window.addEventListener("resize", this.setZoomImageBoundingClientRect);
    window.addEventListener(
      "contextmenu",
      function(e) {
        e.preventDefault();
      },
      false
    );
  }

  render() {
    return (
      <React.Fragment>
        <div> Zoom Factor: {this.state.zoomFactor} </div>
        <div>
          {" "}
          Previous Distance: {this.state.previousDistanceBetweenPointers}{" "}
        </div>
        <div> Active Pointers: {this.activePointers.length}</div>
        <div
          ref={this.assignRef}
          className="PinchToZoom"
          onPointerDown={this.handlePointerDown}
          onPointerMove={this.handlePointerMove}
          onPointerUp={this.handlePointerUp}
          style={{
            touchAction: this.state.touchAction,
            position: "relative",
            height: 600, // TODO - we should stop assuming 600x600px image here.
            width: 600,
            overflow: "hidden"
          }}
        >
          {this.activePointers.map(pointer => {
            <div
              style={{
                position: "absolute",
                width: 200,
                height: 200,
                background: "blue",
                borderRadius: "50%",
                left: this.getPointFromTouch(pointer.current).x,
                top: this.getPointFromTouch(pointer.current).y,
                zIndex: 3000
              }}
            />;
          })}
          <img src={images[600]} alt="Click to zoom" />
          <img
            src={images[1600]}
            alt="Zoomed image"
            ref={this.assignZoomImageRef}
            style={{
              position: "absolute",
              ...this.state.position,
              visibility:
                this.state.zoomFactor > MIN_ZOOM_FACTOR ? "visible" : "hidden",
              width:
                this.containerDimensions.width * this.state.zoomFactor || 1600
            }}
          />
        </div>
      </React.Fragment>
    );
  }
}

export default PinchToZoom;

// TODO
// stop relying on zooming state just rely on zoom factor === 1
// fix max zoom factor to be not hard coded
// dragging with one finger should move everything across the screen, look at leftoffset and top offset
// hook zoom into scroll in / out
// CTA button
// look at request animation frame
// touch.clientX is sometimes NULL
