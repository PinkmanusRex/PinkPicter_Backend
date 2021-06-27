create table users (
	username varchar(20) not null primary key,
    password varchar(255) not null,
    summary varchar(1000),
    banner_public_id varchar(255),
    profile_pic_id varchar(255),
    profile_pic_version int unsigned,
    banner_pic_version int unsigned
);

create table posts (
	post_id int unsigned auto_increment primary key,
    post_public_id varchar(255) not null,
    post_date date not null,
    width smallint unsigned not null,
    height smallint unsigned not null,
    description varchar(1000),
    title varchar(255) not null,
    artist_name varchar(20) not null,
    foreign key (artist_name) references users(username)
		on update cascade
        on delete cascade,
	unique key (post_public_id),
    fulltext key (title)
);

create table following (
	username varchar(20) not null,
    artist_name varchar(20) not null,
    foreign key (username) references users(username)
		on update cascade
        on delete cascade,
	foreign key (artist_name) references users(username)
		on update cascade
        on delete cascade,
	unique key (username, artist_name)
);

create table favorites (
	username varchar(20) not null,
    post_public_id varchar(255) not null,
    favorite_date date not null,
    foreign key (username) references users(username)
		on update cascade
        on delete cascade,
	foreign key (post_public_id) references posts(post_public_id)
		on update cascade
        on delete cascade,
	unique key (username, post_public_id)
);

create table comments (
	comment_id bigint unsigned auto_increment primary key,
    post_public_id varchar(255) not null,
    username varchar(20) not null,
    comment_content varchar(1000) not null,
    post_date date not null,
    foreign key (post_public_id) references posts(post_public_id)
		on update cascade
        on delete cascade,
	foreign key (username) references users(username)
		on update cascade
        on delete cascade
);