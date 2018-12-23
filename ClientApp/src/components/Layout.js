import React from "react";
import { Col, Grid, Row } from "react-bootstrap";
// import NavMenu from './NavMenu';

export default props => (
  <Grid fluid>
    <Row>
      {/* <Col sm={3}>
        <NavMenu />
      </Col> */}
      <Col>{props.children}</Col>
    </Row>
  </Grid>
);
