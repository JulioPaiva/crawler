const app = require('express')(),
	  bodyParser = require("body-parser"),
	  axios = require('axios'),
	  cheerio = require('cheerio');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.post('/', (req, res) => {
	let params = {
		results : [],
		page : 1,
		limit : req.body.limit || 10, 
		search : req.body.search || ""
	}	

    axios.get('https://lista.mercadolivre.com.br/'+ params.search)
	.then(async (response) => {
		let $ = cheerio.load(response.data); 
		$('.results-item').slice(params.limit*(params.page-1),params.limit*params.page).each(function(i, elem) {
			let result = {
				name: $(this).find('.item__title').text().trim(),
				link: $(this).find('a').attr("href"),
				price: $(this).find('.item__price > .price__fraction').text().trim()+','+$(this).find('.item__price > .price__decimals').text().trim()
			};
			params.results.push(result);
		});

		let requests = [];
		params.results.forEach((result) => {
			requests.push(axios.get(result.link));
		});

		await axios.all(requests).then(axios.spread((...responses) => {
	 		responses.forEach((response, index) => {
				let $$ = cheerio.load(response.data);	
				let urlStore = $$('.vip-section-seller-info').find('a').attr('href');		 
				params.results[index].store = urlStore ? urlStore.replace('https://perfil.mercadolivre.com.br/', '').replace('+',' ') : null;
				params.results[index].state = $$('.seller-location .card-description').text().trim() || null;
			});
		}));

		return res.json(params.results);
	}).catch((error) => {
		res.json('Houve um erro, tente novamente! ' + error);
	});   
});

app.listen(5000);
