import React from "react";
import PropTypes from "prop-types";
import { Col, Grid, Row } from "react-bootstrap";
// import NavMenu from './NavMenu';

const Layout = props => (
  <Grid fluid>
    <Row>
      {/* <Col sm={3}>
        <NavMenu />
      </Col> */}
      <Col>{props.children}</Col>
    </Row>
  </Grid>
);

Layout.propTypes = {
  children: PropTypes.node.isRequired
};

export default Layout;
