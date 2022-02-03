'use strict';

var React = require('react');
var utils = require('./utils');
var Loader = require('./components/Loader.jsx');
require('react.backbone');


function ReportedUsersResults(props) {
  if (props.results === null)
    return null;

  var reports = props.results;

  return (<div className='reports'>
    <table className='table table-bordered table-striped table-condensed mb-0'>
      <thead>
        <tr>
          <th>User</th>
          <th>Number of Reports</th>
        </tr>
      </thead>
      <tbody>
        {
          reports.map(rep => {
            return (
              <tr key={rep.target}>
                <td><a
                  href={"../web/users/" + encodeURIComponent(rep.target)}
                  className="report-item"
                  title={rep.target}>
                  {rep.target}
                </a></td>
                <td>{rep.total}</td>
              </tr>
            );
          })
        }
      </tbody>
    </table>
  </div>);

}

var ReportedUsers = React.createClass({
  contextTypes: {
  },

  getInitialState: function () {

    return {
      doFetch: true,
      results: null,
      loading: false,
      error: null
    };
  },

  componentWillMount: function () {
    // fetch user profile, if we have one
    if (this.state.doFetch)
      this.fetchReports();
  },

  fetchReports: function () {

    this.setState({
      loading: true
    });

    utils.xhr({
      method: 'get',
      url: utils.apiPath('/users/highly/reported'),
    }, (err, res, data) => {
      const error = err || (res.statusCode === 200 ? null : data);
      this.setState({
        loading: false,
        error: error || null,
        results: error ? null : data
      }, () => {
        if (this.state.error)
          return;
      });
    });
  },


  renderForm: function () {
    return (
      <div className='reported-users'>

        <Loader error={this.state.error} loading={this.state.loading}>
          <div className='container-fluid h-100'>
            <ReportedUsersResults results={this.state.results} />
          </div>
        </Loader>
      </div>
    );
  },

  render: function () {
    return this.renderForm();
  }
});

module.exports = {
  ReportedUsers: ReportedUsers
};