'use strict';

var React = require('react');
var utils = require('./utils');
var Loader = require('./components/Loader.jsx');
require('react.backbone');

function ChatRoomResults (props) {
  // No need to render anything, no lookups were performed.
  if (props.results === null)
    return null;
    
  const results = props.results;

  // results.messages.push({from: "test1", timestamp: 1429084016331, type: "text", message: "Hey bob! How are you today?"});
  // results.messages.push({from: "test2", timestamp: 1429084013933, type: "text", message: "Hey bob! How are you today?"});
  // results.messages.push({from: "test1", timestamp: 1429084016934, type: "text", message: "Hey bob! How are you today?"});
  // results.messages.push({from: "test2", timestamp: 1429084016926, type: "text", message: "Hey bob! How are you today?"});
  // results.messages.push({from: "test2", timestamp: 1423084016926, type: "text", message: "Hey bob! How are you today?"});
  // results.messages.push({from: "test2", timestamp: 1423084016316, type: "text", message: "Hey bob! How are you today?"});

  const messages = results.messages.sort((a, b) => {
    return a.timestamp - b.timestamp;
  });

  const user1 = results.users[0];
  const user2 = results.users[1];
  const imgeurl = '../images/user-profile.png';
  const imgeurl2 = '../images/user-profile.png';

  const rightOrLeft = (msg) => {return msg.from == '$$' ? 'justify-content-middle' : msg.from == user1 ? 'justify-content-start' : 'justify-content-end'; };
  const image1_Or2 = (msg) => {return  msg.from == user1 ? imgeurl : imgeurl2; };
   
  const getUserRef = (user) => { return <a href={`../users/${encodeURIComponent(user)}`}>`{user}`</a>; };
  
  return (
    <div className='row justify-content-center h-100'>
      <div className='col-md-8 col-xl-6 chat'>
        <div className="card">
          <div className="card-header msg_head">
            <div className="d-flex bd-highlight">
              <div className="img_cont">
                <img src={`${imgeurl}`} className="rounded-circle user_img"/>
                <span className="online_icon"></span>
              </div>
              <div className="user_info">
                <span>Chat between {getUserRef(user1)} and {getUserRef(user2)}</span>
                <p>{messages.length} Messages</p>
              </div>
            </div> 
          </div>
          <div className="card-body msg_card_body">
            {
              messages.map(msg => {
                return msg.from == user1 ? (
                  <div key={msg.timestamp} className={`d-flex ${rightOrLeft(msg)} mb-4`}>
                    <div className="img_cont_msg">
                      <img src={`${image1_Or2(msg)}`} className="rounded-circle user_img_msg"/>
                      <div>{msg.from}</div>
                    </div>
                    <div className="msg_cotainer">{msg.message}
                      <span className="msg_time">{utils.formatDate(+msg.timestamp, 'hh:mm')}</span>
                    </div>
                  </div>
                ) : 
                  (
                    <div key={msg.timestamp} className={`d-flex ${rightOrLeft(msg)} mb-4`}>
                      <div className="msg_cotainer">{msg.message}
                        <span className="msg_time">{utils.formatDate(+msg.timestamp, msg.from == '$$' ? 'YYYY-MM-DD' : 'hh:mm')}</span>
                      </div>
                      <div className="img_cont_msg">
                        <img src={`${image1_Or2(msg)}`} className="rounded-circle user_img_msg"/>
                        {msg.from != '$$' ? (<div>{msg.from}</div>) : null}
                      </div>
                    </div>
                  )
                ;
              })
            }


            {/* <div className="d-flex justify-content-start mb-4">
              <div className="img_cont_msg">
                <img src={`${imgeurl}`} className="rounded-circle user_img_msg"/>
              </div>
              <div className="msg_cotainer">
									Hi, how are you samim?
                <span className="msg_time">8:40 AM, Today</span>
              </div>
            </div>
            <div className="d-flex justify-content-end mb-4">
              <div className="msg_cotainer_send">
									Hi Khalid i am good tnx how about you?
                <span className="msg_time_send">8:55 AM, Today</span>
              </div>
              <div className="img_cont_msg">
                <img src={`${imgeurl2}`} className="rounded-circle user_img_msg"/>
              </div>
            </div> */}
          </div>
          <div className="card-footer"> 
          </div>
        </div>
      </div>
    </div>
  );
}

var ChatRoom = React.createClass({
  contextTypes: {
    router: React.PropTypes.object
  },
  
  getInitialState: function () {

    var hasUser1 = this.props.params.hasOwnProperty('username1');
    var hasUser2 = this.props.params.hasOwnProperty('username2');
  
    return {  
      searchQueryForUser1: hasUser1 ? this.props.params.username1 : '',
      searchQueryForUser2: hasUser2 ? this.props.params.username2 : '',
      doFetch: hasUser1 && hasUser2,
      results: null, 
      loading: false,
      error: null
    };
  },

  componentWillMount: function () {
    // fetch user profile, if we have one
    if (this.state.doFetch)
      this.fetchChat(this.state.searchQueryForUser1, this.state.searchQueryForUser2);
  },

  fetchChat: function(user1, user2) {

    this.setState({ 
      loading: true
    });

    this.context.router.push(utils.webPath('/chat/' + user1 +',' + user2));

    utils.xhr({
      method: 'get',
      url: utils.apiPath('/users/chat/' + encodeURIComponent(user1) + '/' +encodeURIComponent(user2)),
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
      <div className='chat-room'>
        <form className='form-inline' onSubmit={
          event => {
            event.preventDefault();
            this.fetchChat(this.refs.usernameInput1.value, this.refs.usernameInput2.value);
          }
        }>
          <input type='text'
            ref='usernameInput1'
            className='form-control'
            placeholder='username 1'
            defaultValue={this.state.searchQueryForUser1}
          />

          <input type='text'
            ref='usernameInput2'
            className='form-control'
            placeholder='username 2'
            defaultValue={this.state.searchQueryForUser2}
          />
          <input type='submit' className='btn btn-primary' value='Get Chat' />
        </form>
  
        <Loader error={this.state.error} loading={this.state.loading}> 
          <div className='container-fluid h-100'>
            <ChatRoomResults results={this.state.results}/>
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
  ChatRoom: ChatRoom  
};