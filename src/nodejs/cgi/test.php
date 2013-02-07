<html>
<head>
	<title>THERE</title>
</head>
<body>
	<form method="POST">
		<input type="text" name="hello" value="POST">
		<input type="submit"?>
	</form>
	<pre><?= htmlspecialchars((json_encode($_POST, JSON_PRETTY_PRINT))); ?></pre>
</body>
</html>