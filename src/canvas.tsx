import React from 'react';

type PhysicalPoint = {
  x: number,
  y: number,
  type: "physical"
}

type LogicalPoint = {
  x: number,
  y: number,
  type: "logical"
}

type CanvasContainerState = {
  n: number
  rAF: null | number
  center: LogicalPoint
  scale: number
  Xs: LogicalPoint[]
  Os: LogicalPoint[]
}

class CanvasContainer extends React.Component<any, CanvasContainerState> {
  constructor(props : any) {
    super(props);
    this.state = {
      n: 5,
      rAF: null,
      center: {
        x: 0, y: 0, type: "logical"
      },
      scale: 1.0,
      Xs: [{
        x: 0,
        y: 0,
        type: "logical"
      }],
      Os: []
    };
  }

  componentDidMount() {
    this.setState({rAF: requestAnimationFrame(this.updateAnimationState)});
  }

  updateAnimationState = () => {
    this.setState(prevState => ({ n: prevState.n }));
    this.setState({rAF: requestAnimationFrame(this.updateAnimationState)});    
  }

  componentWillUnmount() {
    if (this.state.rAF !== null) {
      cancelAnimationFrame(this.state.rAF);
    }
  }

  render() {
    return <Canvas
            scale={this.state.scale}
            center={this.state.center}
            moveCenter={this.moveCenter}
            xs={this.state.Xs}
            os={this.state.Os}/>;
  }

  moveCenter = (displacement: LogicalPoint) => {
    this.setState({
      center: {
        x: this.state.center.x + displacement.x,
        y: this.state.center.y + displacement.y,
        type: "logical"
      }
    })
    console.log(this.state.center)
  }
}

type CanvasProps = {
  center: LogicalPoint,
  scale: number,
  moveCenter: (displacement: LogicalPoint) => void,
  xs: LogicalPoint[],
  os: LogicalPoint[]
}

type CanvasState = {
  mouseDown : boolean;
  canvasRef : React.RefObject<HTMLCanvasElement>;
  delta : number;
  initialOffset : PhysicalPoint;
  previousTouch : null | PhysicalPoint;
}

class Canvas extends React.Component<CanvasProps, CanvasState> {

  /**
   * The Canvas is responsible for all conversions between mouse
   * coordinates and the logical coordinate grid. 
   */

  constructor(props: CanvasProps) {
    super(props);
    this.state = {
      canvasRef: React.createRef(),
      mouseDown: false,
      delta: 75,
      previousTouch: null,
      initialOffset: {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
        type: "physical"
      }
    }; // TODO verify this assumption that the mouse is up
  }

  handleMouseDown() {
    // console.log(e.clientX, e.clientY)
    this.setState({mouseDown: true})
  }

  handleMouseMove(e : React.MouseEvent<HTMLCanvasElement, MouseEvent>) {
    if (this.state.mouseDown) {
      this.props.moveCenter({x: e.movementX / this.state.delta, y: e.movementY / this.state.delta, type: "logical"})
    }
  }

  handleMouseUp() {
    this.setState({mouseDown: false})
  }

  handleTouchMove(e: React.TouchEvent) {
    e.preventDefault();
    if (this.state.previousTouch != null) {
      const dx = e.touches[0].clientX - this.state.previousTouch.x;
      const dy = e.touches[0].clientY - this.state.previousTouch.y;
      this.setState({previousTouch : {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        type: "physical"
      }})
      this.props.moveCenter({
        x: dx * 1.0 / this.state.delta,
        y: dy * 1.0 / this.state.delta,
        type: "logical"
      })
    } else {
      this.setState({previousTouch : {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        type: "physical"
      }})
    }
    
  }

  handleTouchStart(e: React.TouchEvent) {
    this.setState({previousTouch : {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      type: "physical"
    }})
  }

  handleTouchEnd(e: React.TouchEvent) {
    this.setState({previousTouch : null})
  }

  render() {
    return <canvas
            ref={this.state.canvasRef}
            onMouseDown={this.handleMouseDown.bind(this)}
            onMouseMove={this.handleMouseMove.bind(this)}
            onMouseUp={this.handleMouseUp.bind(this)}
            onTouchStart={this.handleTouchStart.bind(this)}
            onTouchMove={this.handleTouchMove.bind(this)}
            onTouchEnd={this.handleTouchEnd.bind(this)}
            />;
  }

  componentDidUpdate() {
    const canvas = this.state.canvasRef.current;
    if (canvas == null) return;
    canvas.width = window.innerWidth; //document.width is obsolete
    canvas.height = window.innerHeight; //document.height is obsolete
    this.draw(canvas);
  }

  draw(canvas : HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (ctx == null) return;

    const { center } = this.props;

    const delta = this.state.delta / this.props.scale;

    for (var x = (center.x % 1) * delta; x < canvas.width; x += delta) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (var y = (center.y % 1) * delta; y < canvas.height; y += delta) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    for (let pt of this.props.xs) {
      if (!this.onScreen(pt)) return;
      const {x, y} = this.log_to_phys(pt);
      ctx.beginPath();
      ctx.moveTo(x - 20, y - 20);
      ctx.lineTo(x + 20, y + 20);

      ctx.moveTo(x + 20, y - 20);
      ctx.lineTo(x - 20, y + 20);
      ctx.stroke();
    }
  }

  log_to_phys(pt: LogicalPoint): PhysicalPoint {
    const {center} = this.props;
    const {delta, initialOffset} = this.state;
    const canvas = this.state.canvasRef.current;
    if (canvas == null) return {x: 0, y: 0, type: "physical"};

    return {
      x: (center.x + pt.x) * delta + initialOffset.x,
      y: (center.y + pt.y) * delta + initialOffset.y,
      type: "physical"
    }
  }

  onScreen(pt: LogicalPoint): boolean {
    const {x, y} = this.log_to_phys(pt);
    const canvas = this.state.canvasRef.current;
    if (canvas == null) return false;
    return x >= 0 && x <= canvas.width && y >= 0 && y <= canvas.height;
  }

}
export default CanvasContainer