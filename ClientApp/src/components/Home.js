import React from "react";
import { bindActionCreators } from "redux";
import { connect } from "react-redux";
import { actionCreators, selectors } from "../store/PieceClassifier/reducer";

class Home extends React.Component {
  ctxDimensions = {
    width: undefined,
    height: undefined
  };

  colorThreshold = 50;
  modifier = 1;
  scale = 0.25;
  edgeThreshold = 3;
  noiseThreshold = 1;

  piecePixels = {
    xColumns: {},
    yRows: {}
  };

  emptyPixels = [];

  constructor(props) {
    super(props);

    this.state = {
      pieces: {},
      edges: {},
      showXEdges: true,
      showYEdges: true,
      selectedImageSource: "puzzlePieces3.jpg",
      imageSources: [
        "puzzlePieces.jpg",
        "puzzlePieces2.jpg",
        "puzzlePieces3.jpg"
      ]
    };

    this.draw = this.draw.bind(this);
    this.drawPieces = this.drawPieces.bind(this);
    this.drawEdges = this.drawEdges.bind(this);
    this.toggleXEdges = this.toggleXEdges.bind(this);
    this.toggleYEdges = this.toggleYEdges.bind(this);
    this.updateImage = this.updateImage.bind(this);
  }

  componentDidMount = () => {
    this.rawcanvas = this.refs.rawcanvas;
    this.rawctx = this.rawcanvas.getContext("2d");

    this.canvas = this.refs.canvas;
    this.ctx = this.canvas.getContext("2d");

    this.img = this.refs.image;

    this.img.onload = () => {
      let imageWidth = this.img.width;
      let imageHeight = this.img.height;

      this.rawcanvas.height = this.rawcanvas.width * (imageHeight / imageWidth);
      this.canvas.height = this.rawcanvas.height;

      this.rawctx.filter = "grayscale(100%)";
      this.rawctx.filter = "invert(100%)";
      this.rawctx.drawImage(
        this.img,
        0,
        0,
        imageWidth * this.scale,
        imageHeight * this.scale
      );
      // this.rawctx.filter = 'grayscale(0)'
      // this.rawctx.filter = 'invert(0)'

      this.ctxDimensions.width = imageWidth * this.scale;
      this.ctxDimensions.height = imageHeight * this.scale;

      const pixelData = this.rawctx.getImageData(
        0,
        0,
        this.ctxDimensions.width,
        this.ctxDimensions.height
      );

      this.findEdges(pixelData);
    };
  };

  async findEdges(pixelData) {
    let pieces = await selectors.getPieces(
      this.props,
      pixelData,
      this.ctxDimensions
    );
    let edges = await selectors.getEdges(this.props, pieces);
    console.log(edges);
    this.setState({ pieces, edges });
  }

  async draw() {
    if (!this.ctx || !this.canvas) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    await this.drawPieces();
    await this.drawEdges();
  }

  async drawPieces() {
    const { pieceSet } = this.state.pieces;
    if (!pieceSet) return;

    Object.keys(pieceSet).forEach(pieceKey => {
      const piece = pieceSet[pieceKey];
      this.drawPiece(piece);

      this.ctx.strokeStyle = "red";
      this.ctx.rect(
        piece.minX,
        piece.minY,
        piece.maxX - piece.minX,
        piece.maxY - piece.minY
      );
      this.ctx.stroke();
    });
  }

  async drawEdges() {
    const { edges } = this.state;
    if (!edges) return;

    Object.keys(edges).forEach(pieceKey => {
      const piece = edges[pieceKey];
      Object.keys(piece.corners).forEach(edgeKey => {
        const edge = piece.corners[edgeKey];
        //this.drawPiece(piece);
        // console.log(edge)
        this.ctx.beginPath();
        this.ctx.fillStyle = "lime";
        this.ctx.arc(edge.x, edge.y, 5, 0, 2 * Math.PI, false);
        this.ctx.fill();
      });

      Object.keys(piece.angles).forEach(angleKey => {
        const edge = piece.angles[angleKey];
        //this.drawPiece(piece);
        // console.log(edge)
        this.ctx.beginPath();
        this.ctx.strokeStyle = "red";
        this.ctx.moveTo(edge.p1.x, edge.p1.y);
        this.ctx.lineTo(edge.p2.x, edge.p2.y);
        this.ctx.stroke();
      });
    });
  }

  drawPiecePixels() {
    const { pieces, showXEdges, showYEdges } = this.state;
    const { piecePixels } = pieces;

    const edgePixels = Object.keys(piecePixels).filter(
      i => !!piecePixels[i].xEdge || !!piecePixels[i].yEdge
    );

    edgePixels.forEach(i => {
      const piecePixel = piecePixels[i];

      if (showXEdges && !!piecePixel.xEdge) {
        this.ctx.fillStyle = "red";
        this.ctx.beginPath();
        this.ctx.arc(piecePixel.x, piecePixel.y, 0.5, 0, 2 * Math.PI, false);
        this.ctx.fill();
        this.ctx.beginPath();
      } else if (showYEdges && !!piecePixel.yEdge) {
        this.ctx.fillStyle = "green";
        this.ctx.beginPath();
        this.ctx.arc(piecePixel.x, piecePixel.y, 0.5, 0, 2 * Math.PI, false);
        this.ctx.fill();
        this.ctx.beginPath();
      } else {
        this.ctx.fillStyle = "blue";
        this.ctx.beginPath();
        this.ctx.arc(piecePixel.x, piecePixel.y, 0.5, 0, 2 * Math.PI, false);
        this.ctx.fill();
        this.ctx.beginPath();
      }
    });
  }

  drawPiece(piece) {
    const pixels = Object.keys(piece.pixels);

    this.ctx.fillStyle = "#" + (((1 << 24) * Math.random()) | 0).toString(16);
    pixels.forEach(i => {
      const piecePixel = piece.pixels[i];

      this.ctx.beginPath();
      this.ctx.arc(piecePixel.x, piecePixel.y, 0.5, 0, 2 * Math.PI, false);
      this.ctx.fill();
      this.ctx.beginPath();
    });
  }

  toggleXEdges() {
    this.setState({ showXEdges: !this.state.showXEdges });
  }

  toggleYEdges() {
    this.setState({ showYEdges: !this.state.showYEdges });
  }

  updateImage(e) {
    this.setState({ selectedImageSource: e.target.value });
  }

  render() {
    const {
      pieces,
      edges,
      showXEdges,
      showYEdges,
      imageSources,
      selectedImageSource
    } = this.state;

    const { pieceSet } = pieces;

    if (!!pieces && !!edges) {
      this.draw();
    }
    return (
      <div style={{ display: "flex" }}>
        <div>
          <canvas ref="rawcanvas" width={800} height={800} className="hidden" />
          <canvas ref="canvas" width={800} height={800} />
          {/* <img alt="puzzle piece" ref="image" src="./puzzlePieces.jpg" className="" /> */}
          {/* <img alt="puzzle piece" ref="image" src="./puzzlePieces2.jpg" className="hidden" /> */}
          <img
            alt="puzzle piece"
            ref="image"
            src={`./${selectedImageSource}`}
            className="hidden"
          />
        </div>
        <div>
          <div>
            <select value={selectedImageSource} onChange={this.updateImage}>
              {imageSources.map(imageSource => (
                <option key={imageSource} value={imageSource}>
                  {imageSource}
                </option>
              ))}
            </select>
          </div>
          <div>
            <button onClick={this.toggleXEdges}>
              {showXEdges ? "Hide" : "Show"} X Edges
            </button>{" "}
            {!!pieces &&
              !!pieces.xEdges &&
              Object.keys(pieces.xEdges).length > 0 &&
              Object.keys(pieces.xEdges).length}
          </div>
          <div>
            <button onClick={this.toggleYEdges}>
              {showYEdges ? "Hide" : "Show"} Y Edges
            </button>{" "}
            {!!pieces &&
              !!pieces.yEdges &&
              Object.keys(pieces.yEdges).length > 0 &&
              Object.keys(pieces.yEdges).length}
          </div>
          <div>
            {!!pieceSet &&
              Object.keys(pieceSet).map(pieceKey => {
                const piece = pieceSet[pieceKey];
                return (
                  <div key={pieceKey}>
                    {pieceKey} - X Min: {piece.minX}, X Max: {piece.maxX}, Y
                    Min: {piece.minY}, Y Max: {piece.maxY}, Pixel Count:{" "}
                    {Object.keys(piece.pixels).length}
                  </div>
                );
              })}
          </div>
          <div>
            {!!edges &&
              Object.keys(edges).map(pieceKey => {
                const piece = edges[pieceKey];
                // console.log(piece)
                return Object.keys(piece.corners).map(cornerKey => {
                  const edge = piece.corners[cornerKey];
                  return (
                    <div key={cornerKey}>
                      {cornerKey} - X: {edge.x}, Y: {edge.y}
                    </div>
                  );
                });
              })}
          </div>
        </div>
      </div>
    );
  }
}
export default connect(
  state => state.PieceClassifier,
  dispatch => bindActionCreators(actionCreators, dispatch)
)(Home);
