import $ from "jquery";
import Tester from "./components/tester.jsx";
import React from "react";
require("./react_ujs.js");

window.Tester = Tester;

$.ajaxPrefilter(function( options ) {
  if ( !options.beforeSend) {
    options.beforeSend = function (xhr) {
      xhr.setRequestHeader('X-CSRF-Token',  $('meta[name="csrf-token"]').attr('content'));
    }
  }
});
