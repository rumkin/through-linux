<?php

header("HTTP/1.1 500 Internal server error", true, 500);
error_reporting(-1);

echo $a

?><html>
<head>
	<title>THERE</title>
</head>
<body>
	<form method="POST">
		<input type="text" name="hello" value="POST">
		<input type="submit"?>
	</form>
	<pre><?= var_dump($_POST); ?></pre>
</body>
</html>