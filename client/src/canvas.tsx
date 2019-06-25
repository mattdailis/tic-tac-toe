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

type Move = LogicalPoint & {
  player: "x" | "o"
}

type CanvasContainerState = {
  n: number
  rAF: null | number
  center: LogicalPoint
  scale: number
  moves: Move[]
  ws: WebSocket
}

class CanvasContainer extends React.Component<any, CanvasContainerState> {

  constructor(props : any) {
    super(props);
    console.log(window.location)
    this.state = {
      n: 5,
      rAF: null,
      center: {
        x: 0, y: 0, type: "logical"
      },
      scale: 1.0,
      moves: [{
        player: "x",
        x: 0,
        y: 0,
        type: "logical"
      }],
      ws: new WebSocket("ws://" + window.location.host + "/ws")
    };
  }

  componentDidMount() {

    const { ws } = this.state

    ws.onopen = () => {
      console.log('connected')
    }

    ws.onmessage = evt => {      
      const message = JSON.parse(evt.data)
      const { game_id, moves } = message;
      this.setState({moves : moves})
    }

    ws.onclose = () => {
      console.log('disconnected')
      // automatically try to reconnect on connection loss
      this.setState({
        ws: new WebSocket("ws://" + window.location.host + "/ws"),
      })
    }

    // this.setState({rAF: requestAnimationFrame(this.updateAnimationState)});
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

  click = (pt: LogicalPoint) => {
    var x_next = true
    if (this.state.moves.length > 0 && this.state.moves[this.state.moves.length - 1].player == "x") {
      x_next = false
    }
    const move : Move = {
      player: x_next ? "x" : "o",
      x: Math.floor(pt.x + 0.5),
      y: Math.floor(pt.y + 0.5),
      type: "logical"
    }

    // Check if this square is occupied
    for (let prevMove of this.state.moves) {
      if (Math.floor(prevMove.x + 0.5) == Math.floor(move.x + 0.5) && 
          Math.floor(prevMove.y + 0.5) == Math.floor(move.y + 0.5)) {
            return;
      }
    }

    this.setState({
      moves: this.state.moves.concat([move])
    });

    const message = {
      player: move.player,
      x: move.x,
      y: move.y
    }
    this.state.ws.send(JSON.stringify(message))
  }

  render() {
    return <Canvas
            scale={this.state.scale}
            center={this.state.center}
            moveCenter={this.moveCenter}
            moves={this.state.moves}
            click={this.click}/>;
  }

  moveCenter = (displacement: LogicalPoint) => {
    this.setState({
      center: {
        x: this.state.center.x + displacement.x,
        y: this.state.center.y + displacement.y,
        type: "logical"
      }
    })
  }
}

type CanvasProps = {
  center: LogicalPoint,
  scale: number,
  moveCenter: (displacement: LogicalPoint) => void,
  moves: Move[],
  click: (pt: LogicalPoint) => void
}

type CanvasState = {
  mouseDown : boolean;
  mouseMoved: boolean;
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
      mouseMoved: false,
      delta: 50,
      previousTouch: null,
      initialOffset: {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
        type: "physical"
      }
    }; // TODO verify this assumption that the mouse is up
  }

  handleMouseDown() {
    this.setState({mouseDown: true, mouseMoved: false})
  }

  handleMouseMove(e : React.MouseEvent<HTMLCanvasElement, MouseEvent>) {
    this.setState({mouseMoved: true})
    if (this.state.mouseDown) {
      this.props.moveCenter({x: e.movementX / this.state.delta, y: e.movementY / this.state.delta, type: "logical"})
    }
  }

  handleMouseUp(e : React.MouseEvent<HTMLCanvasElement, MouseEvent>) {
    this.setState({mouseDown: false})
  }

  handleDoubleClick(e : React.MouseEvent<HTMLCanvasElement, MouseEvent>) {
    // if (!this.state.mouseMoved) {
    this.props.click(this.phys_to_log({
      x: e.clientX,
      y: e.clientY,
      type: "physical"
    }))
    // }
  }

  handleTouchMove(e: React.TouchEvent) {
    this.setState({mouseMoved: true})
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
    if (!this.state.mouseMoved && this.state.previousTouch != null) {
      this.props.click(this.phys_to_log({
        x: this.state.previousTouch.x,
        y: this.state.previousTouch.y,
        type: "physical"
      }))
    }
  }

  handleWheel(e : React.WheelEvent<HTMLCanvasElement>){
    if (e.deltaY > 0) {
      this.setState({delta: this.state.delta + 1})
    } else if (e.deltaY < 0 && this.state.delta > 20) {
      this.setState({delta: this.state.delta - 1})
    }
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
            onDoubleClick={this.handleDoubleClick.bind(this)}
            onWheel={this.handleWheel.bind(this)}
            />;
  }

  componentDidMount() {
    this.draw()
  }
  componentDidUpdate() {
    this.draw()
  }

  draw() {
    const canvas = this.state.canvasRef.current;
    if (canvas == null) return;
    canvas.width = window.innerWidth; //document.width is obsolete
    canvas.height = window.innerHeight; //document.height is obsolete
    const ctx = canvas.getContext("2d");
    if (ctx == null) return;

    const { center } = this.props;

    const delta = this.state.delta / this.props.scale;

    for (var x = (center.x % 1 - 0.5) * delta + this.state.initialOffset.x % delta; x < canvas.width; x += delta) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (var y = (center.y % 1 - 0.5) * delta + this.state.initialOffset.y % delta;  y < canvas.height; y += delta) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    if (this.props.moves.length > 0) {
      const {x, y} = this.log_to_phys(this.props.moves[this.props.moves.length - 1])
      ctx.fillStyle = "#00FFFF";
      ctx.fillRect(1 + x - delta / 2, 1 + y - delta / 2, delta - 2, delta - 2);
    }

    for (let pt of this.props.moves) {
      if (!this.nearScreen(pt)) continue;
      const {x, y} = this.log_to_phys(pt);
      const k = 20 * delta/75

      if (pt.player == "x") {
        ctx.beginPath();
        ctx.moveTo(x - k, y - k);
        ctx.lineTo(x + k, y + k);

        ctx.moveTo(x + k, y - k);
        ctx.lineTo(x - k, y + k);
        ctx.stroke();
      } else if (pt.player == "o") {
        ctx.beginPath();
        ctx.arc(x, y, 0.3 * delta, 0, 2 * Math.PI);
        ctx.stroke();
      }
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

  phys_to_log(pt: PhysicalPoint): LogicalPoint {
    const {center} = this.props;
    const {delta, initialOffset} = this.state;
    const canvas = this.state.canvasRef.current;
    if (canvas == null) return {x: 0, y: 0, type: "logical"};

    return {
      x: ((pt.x - initialOffset.x) / delta) - center.x,
      y: ((pt.y - initialOffset.y) / delta) - center.y,
      type: "logical"
    }
  }

  nearScreen(pt: LogicalPoint) {
    const topLeft: LogicalPoint = {
      x: pt.x - 0.5,
      y: pt.y - 0.5,
      type: "logical"
    }
    const topRight: LogicalPoint = {
      x: pt.x + 0.5,
      y: pt.y - 0.5,
      type: "logical"
    }
    const bottomLeft: LogicalPoint = {
      x: pt.x - 0.5,
      y: pt.y + 0.5,
      type: "logical"
    }
    const bottomRight: LogicalPoint = {
      x: pt.x + 0.5,
      y: pt.y + 0.5,
      type: "logical"
    }
    return this.onScreen(topLeft) ||
      this.onScreen(topRight) ||
      this.onScreen(bottomLeft) ||
      this.onScreen(bottomRight)
  }

  onScreen(pt: LogicalPoint): boolean {
    const {x, y} = this.log_to_phys(pt);
    const canvas = this.state.canvasRef.current;
    if (canvas == null) return false;
    return x >= 0 && x <= canvas.width && y >= 0 && y <= canvas.height;
  }

}
export default CanvasContainer