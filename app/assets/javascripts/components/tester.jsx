import React from "react";

class Tester extends React.Component {
  componentDidMount() {
    console.log("mounted");
  }

  render() {
    return (
      <div>
        <h2>{this.props.title}</h2>
      </div>
    );
  }
}

export default Flasher;
