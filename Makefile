all: deploy

build:
	npx pxt build -localbuild

deploy:
	npx pxt deploy -localbuild

test:
	npx pxt test -localbuild
