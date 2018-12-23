import React, { Component } from "react";
import PropTypes from "prop-types";

export class PuzzleDetails extends Component {
  static propTypes = {
    selectedImageSource: PropTypes.string,
    imageSources: PropTypes.arrayOf.string,
    pieceSet: PropTypes.any,
    edges: PropTypes.any,
    updateImage: PropTypes.func
  };

  render() {
    const {
      selectedImageSource,
      imageSources,
      pieceSet,
      edges,
      updateImage
    } = this.props;

    return (
      <div>
        <div>
          <select value={selectedImageSource} onChange={updateImage}>
            {imageSources.map(imageSource => (
              <option key={imageSource} value={imageSource}>
                {imageSource}
              </option>
            ))}
          </select>
        </div>
        {/* <div>
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
        </div> */}
        <div>
          {!!pieceSet &&
            Object.keys(pieceSet).map(pieceKey => {
              const piece = pieceSet[pieceKey];
              return (
                <div key={pieceKey}>
                  {pieceKey} - X Min: {piece.minX}, X Max: {piece.maxX}, Y Min:{" "}
                  {piece.minY}, Y Max: {piece.maxY}, Pixel Count:{" "}
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
    );
  }
}

export default PuzzleDetails;
