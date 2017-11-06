/**
 * Created by zhangguozhi on 2016/11/16.
 */

var url = require('url');
module.exports = function(req, res, next){
	var parsedUrl = url.parse(req.url);
	if (!req.cookies || !req.cookies.session) {
		if (parsedUrl.pathname != "/users/login" && parsedUrl.pathname != "/users/authorize") {
			res.cookie("authorizeSuccessRedirect", req.url);
			res.redirect("/users/login");
			return;
		}
	}
	next();
}

